"""
Echofy AI Service — main.py
────────────────────────────
Puerto interno: 3000  →  externo: 8090

Modelos:
  llama3.2:3b  → chat premium con memoria y skills
  gemma2:2b    → clasificador rápido, búsqueda, recomendaciones free

Flujo general:
  1. Frontend manda mensaje + JWT
  2. Validamos token
  3. Modelo ligero clasifica la intención
  4. Se ejecuta la skill correspondiente
  5. Modelo principal genera respuesta en lenguaje natural
  6. Guardamos en historial Redis y respondemos
"""

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import httpx
import redis.asyncio as aioredis
import motor.motor_asyncio
import json, os, re, jwt as pyjwt 
from dotenv import load_dotenv

from dj_router import dj_router
app.include_router(dj_router)

from skills import (
    recommend_from_history,
    recommend_by_song,
    search_youtube,
    get_playlist_videos,
    search_itunes,
    enrich_metadata,
    ingest_url,
    ingest_status,
    create_auto_playlist,
)

load_dotenv()

app = FastAPI(title="Echofy AI Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Configuración ──────────────────────────────────────
OLLAMA_URL  = os.getenv("OLLAMA_URL",  "http://ollama:11434")
MODEL_MAIN  = os.getenv("MODEL_MAIN",  "llama3.2:3b")
MODEL_LIGHT = os.getenv("MODEL_LIGHT", "gemma2:2b")
REDIS_URL   = os.getenv("REDIS_AI_URL","redis://redis-ai:6379")
MONGO_URI   = os.getenv("MONGO_URI")
JWT_SECRET  = os.getenv("JWT_SECRET")
CONV_TTL    = int(os.getenv("CONVERSATION_TTL",     "86400"))
MAX_HISTORY = int(os.getenv("MAX_HISTORY_MESSAGES",  "20"))

# ── Clientes ───────────────────────────────────────────
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db           = mongo_client["Echofy-Music-Data"]
songs_col    = db["musics"]   # ← ajusta si tu colección tiene otro nombre


# ══════════════════════════════════════════════════════
#  Helpers internos
# ══════════════════════════════════════════════════════

def decode_token(raw: str) -> dict:
    token = raw.replace("Bearer ", "").strip()
    try:
        return pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


async def get_history(user_id: str) -> list:
    raw = await redis_client.get(f"ai:conv:{user_id}")
    return json.loads(raw) if raw else []


async def save_history(user_id: str, history: list):
    # Mantener solo los últimos MAX_HISTORY * 2 mensajes (pares user/assistant)
    trimmed = history[-(MAX_HISTORY * 2):]
    await redis_client.set(f"ai:conv:{user_id}", json.dumps(trimmed), ex=CONV_TTL)


async def get_recent(user_id: str, limit: int = 10) -> list:
    raw = await redis_client.get(f"ai:recent:{user_id}")
    data = json.loads(raw) if raw else []
    return data[:limit]


async def call_ollama(model: str, prompt: str, system: str = "") -> str:
    """Llama a Ollama y devuelve la respuesta como texto limpio."""
    payload = {"model": model, "prompt": prompt, "stream": False}
    if system:
        payload["system"] = system

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
        resp.raise_for_status()
        return resp.json()["response"].strip()


def serialize_song(doc: dict) -> dict:
    """Convierte ObjectId → str para serialización JSON."""
    doc["_id"] = str(doc.get("_id", ""))
    return doc


# ══════════════════════════════════════════════════════
#  Clasificador de intención (modelo ligero)
# ══════════════════════════════════════════════════════

INTENT_SYSTEM = """Eres un clasificador de intenciones musicales.
Responde ÚNICAMENTE con un objeto JSON válido. Sin texto adicional, sin markdown, sin explicaciones.

Intenciones disponibles:
- "recommend"   → el usuario pide recomendaciones o canciones similares a lo que escucha
- "search_db"   → busca una canción o artista específico en nuestra biblioteca
- "search_yt"   → quiere escuchar algo que probablemente no tenemos, buscar en YouTube
- "ingest"      → quiere añadir canciones al sistema desde un link de YouTube
- "playlist"    → quiere que le crees una playlist automática
- "chat"        → conversación general sobre música, preguntas, opiniones

Formato de respuesta:
{"intent": "...", "query": "término extraído del mensaje", "genre": "género si se menciona o null", "url": "URL si hay una en el mensaje o null"}"""


async def classify_intent(message: str) -> dict:
    """Clasifica la intención del mensaje con el modelo ligero."""
    try:
        raw = await call_ollama(
            MODEL_LIGHT,
            f'Mensaje: "{message}"',
            INTENT_SYSTEM,
        )
        # Limpiar posible markdown que el modelo añada
        raw = raw.strip().strip("```json").strip("```").strip()
        # Extraer solo el JSON si hay texto extra
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            raw = match.group(0)
        return json.loads(raw)
    except Exception:
        # Fallback seguro si el modelo no devuelve JSON válido
        return {"intent": "chat", "query": message, "genre": None, "url": None}


# ══════════════════════════════════════════════════════
#  Modelos de request / response
# ══════════════════════════════════════════════════════

class ChatRequest(BaseModel):
    message: str

class RecommendRequest(BaseModel):
    song_id: Optional[str] = None   # si viene → similar a esa canción
    limit:   Optional[int] = 8

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 8

class IngestRequest(BaseModel):
    url:   str
    genre: Optional[str] = "Unknown"

class RecentSongPayload(BaseModel):
    song: dict   # { _id, title, artist, genre, artwork, driveId }


# ══════════════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════════════

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models": {"main": MODEL_MAIN, "light": MODEL_LIGHT},
    }


# ── CHAT PREMIUM (llama3.2:3b) ─────────────────────────
@app.post("/api/ai/chat")
async def chat(req: ChatRequest, authorization: str = Header(...)):
    """
    Chat inteligente para usuarios premium.
    Flujo:
      1. Clasificar intención (modelo ligero)
      2. Ejecutar skill si aplica
      3. Generar respuesta natural (modelo principal)
      4. Guardar en historial Redis
    """
    payload = decode_token(authorization)
    user_id = payload.get("id")

    history = await get_history(user_id)
    recent  = await get_recent(user_id, limit=8)
    recent_str = ", ".join(s.get("title", "") for s in recent[:5]) or "ninguna aún"

    # 1. Clasificar intención
    intent_data = await classify_intent(req.message)
    intent = intent_data.get("intent", "chat")
    query  = intent_data.get("query")  or req.message
    genre  = intent_data.get("genre")  or "Unknown"
    url    = intent_data.get("url")

    # 2. Ejecutar skill y construir contexto para el modelo principal
    skill_context  = ""
    extra_data     = {}   # datos estructurados para el frontend

    if intent == "recommend":
        songs = await recommend_from_history(songs_col, recent, limit=8)
        skill_context = (
            f"Encontré {len(songs)} canciones recomendadas basadas en sus gustos: "
            + ", ".join(f"{s['title']} de {s['artist']}" for s in songs[:5])
        )
        extra_data = {"songs": songs}

    elif intent == "search_db":
        pat    = re.compile(re.escape(query), re.IGNORECASE)
        cursor = songs_col.find(
            {
                "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
                "$or": [{"title": pat}, {"artist": pat}, {"genre": pat}],
            },
            {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1}
        ).limit(8)
        found = [serialize_song(s) for s in await cursor.to_list(length=8)]
        skill_context = (
            f"En nuestra biblioteca encontré {len(found)} canciones para '{query}': "
            + ", ".join(f"{s['title']} de {s['artist']}" for s in found[:5])
            if found else f"No encontré canciones para '{query}' en nuestra biblioteca."
        )
        extra_data = {"songs": found}

    elif intent == "search_yt":
        yt_results = await search_youtube(query, limit=5)
        skill_context = (
            f"En YouTube encontré {len(yt_results)} resultados para '{query}'."
            if yt_results else f"No encontré resultados en YouTube para '{query}'."
        )
        extra_data = {"youtube": yt_results}

    elif intent == "ingest":
        target_url = url or query
        if "youtube.com" in target_url or "youtu.be" in target_url:
            job = await ingest_url(target_url, genre)
            skill_context = (
                f"Inicié la descarga de '{target_url}'. "
                f"Job ID: {job.get('job_id', 'N/A')}. "
                "Las canciones estarán disponibles en unos minutos."
            )
            extra_data = {"job": job}
        else:
            skill_context = "Necesito un link de YouTube para añadir canciones al sistema."

    elif intent == "playlist":
        result = await create_auto_playlist(
            db,
            user_id,
            name=f"Mix de {genre}" if genre and genre != "Unknown" else "Mi mix personal",
            criteria={
                "genre":        genre if genre != "Unknown" else None,
                "unheard_only": True,
                "limit":        20,
            },
            recent_song_ids=[str(s.get("_id", "")) for s in recent],
        )
        pl = result.get("playlist", {})
        skill_context = (
            f"Creé la playlist '{pl.get('name')}' con {pl.get('count', 0)} canciones "
            "de géneros que no has escuchado recientemente."
        )
        extra_data = {"playlist": pl}

    # 3. Construir prompt con historial
    history_text = "".join(
        f"{'Usuario' if m['role'] == 'user' else 'Echofy AI'}: {m['content']}\n"
        for m in history[-MAX_HISTORY:]
    )

    system = f"""Eres Echofy AI, el asistente musical personal del usuario.
Tienes acceso a su historial y puedes ejecutar acciones en la plataforma.
El usuario escuchó recientemente: {recent_str}.
{f"Acción ejecutada: {skill_context}" if skill_context else ""}
Responde siempre en español, de forma amigable y concisa (máximo 2-3 párrafos).
Si mencionas canciones, indica siempre título y artista."""

    prompt = f"{history_text}Usuario: {req.message}\nEchofy AI:"
    response = await call_ollama(MODEL_MAIN, prompt, system)

    # 4. Guardar en historial
    history.append({"role": "user",      "content": req.message})
    history.append({"role": "assistant", "content": response})
    await save_history(user_id, history)

    return {
        "response": response,
        "intent":   intent,
        "model":    MODEL_MAIN,
        **extra_data,       # songs / youtube / playlist / job según la acción
    }


# ── RECOMENDACIONES (gemma2:2b, free + premium) ────────
@app.post("/api/ai/recommend")
async def recommend(req: RecommendRequest, authorization: str = Header(...)):
    """
    Cola 'A continuación' inteligente.
    - Si viene song_id → canciones similares a esa canción
    - Si no → basadas en historial del usuario
    No usa el modelo principal — responde directo desde Mongo.
    """
    payload = decode_token(authorization)
    user_id = payload.get("id")

    if req.song_id:
        songs = await recommend_by_song(songs_col, req.song_id, limit=req.limit)
    else:
        recent = await get_recent(user_id)
        songs  = await recommend_from_history(songs_col, recent, limit=req.limit)

    return {"songs": songs, "count": len(songs)}


# ── BÚSQUEDA INTELIGENTE (gemma2:2b, free + premium) ───
@app.post("/api/ai/search")
async def search(req: SearchRequest, authorization: str = Header(...)):
    """
    Búsqueda en tres capas:
      1. Nuestra BD (Mongo)
      2. iTunes (metadata oficial si hay pocos en BD)
      3. YouTube (si el usuario lo pide explícitamente)
    """
    decode_token(authorization)   # solo validar, no necesitamos user_id

    # Capa 1: Mongo
    pat    = re.compile(re.escape(req.query), re.IGNORECASE)
    cursor = songs_col.find(
        {
            "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
            "$or": [{"title": pat}, {"artist": pat}, {"genre": pat}],
        },
        {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1}
    ).limit(req.limit)
    db_results = [serialize_song(s) for s in await cursor.to_list(length=req.limit)]

    # Capa 2: iTunes si hay pocos resultados en BD
    itunes_results = []
    if len(db_results) < 3:
        itunes_results = await search_itunes(req.query, limit=5)

    # Capa 3: YouTube solo si el usuario lo pide explícitamente
    yt_results = []
    yt_keywords = ["youtube", "youtu", "video", "escuchar en", "link"]
    if any(kw in req.query.lower() for kw in yt_keywords):
        yt_results = await search_youtube(req.query, limit=5)

    return {
        "in_system": db_results,
        "itunes":    itunes_results,
        "youtube":   yt_results,
        "total":     len(db_results) + len(itunes_results),
    }


# ── INGESTA MANUAL ──────────────────────────────────────
@app.post("/api/ai/ingest")
async def ingest(req: IngestRequest, authorization: str = Header(...)):
    """Dispara la ingesta de una URL de YouTube directamente."""
    decode_token(authorization)
    result = await ingest_url(req.url, req.genre)
    return result


# ── STATUS DE INGESTA ───────────────────────────────────
@app.get("/api/ai/ingest/status/{job_id}")
async def ingest_status_endpoint(job_id: str, authorization: str = Header(...)):
    decode_token(authorization)
    return await ingest_status(job_id)


# ── GUARDAR CANCIÓN REPRODUCIDA EN CONTEXTO ─────────────
@app.post("/api/ai/context/recent")
async def save_recent(payload: RecentSongPayload, authorization: str = Header(...)):
    """
    El servicio player llama esto cada vez que el usuario reproduce una canción.
    Mantiene el contexto fresco para el modelo.
    """
    user_payload = decode_token(authorization)
    user_id      = user_payload.get("id")

    key    = f"ai:recent:{user_id}"
    raw    = await redis_client.get(key)
    recent = json.loads(raw) if raw else []

    # Deduplicar y añadir al principio
    song_id = str(payload.song.get("_id", ""))
    recent  = [s for s in recent if str(s.get("_id", "")) != song_id]
    recent.insert(0, payload.song)
    recent  = recent[:20]   # máximo 20 canciones en contexto

    await redis_client.set(key, json.dumps(recent), ex=CONV_TTL)
    return {"ok": True}


# ── BORRAR HISTORIAL DE CONVERSACIÓN ────────────────────
@app.delete("/api/ai/chat/history")
async def clear_history(authorization: str = Header(...)):
    """Borra el historial de chat del usuario (no el contexto musical)."""
    payload = decode_token(authorization)
    await redis_client.delete(f"ai:conv:{payload.get('id')}")
    return {"ok": True, "message": "Historial borrado"}