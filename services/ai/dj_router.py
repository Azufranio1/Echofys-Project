"""
Echofy DJ — Router
───────────────────
Endpoints del modo DJ de sesión autónomo.
Se monta en main.py con: app.include_router(dj_router)

Endpoints:
  POST /api/ai/dj/start        → inicia sesión DJ con mood del usuario
  POST /api/ai/dj/next         → siguiente canción + narración de transición
  POST /api/ai/dj/queue        → pre-carga cola de canciones para el cliente
  GET  /api/ai/dj/session      → estado actual de la sesión
  DELETE /api/ai/dj/session    → termina la sesión DJ
"""

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel
from typing import Optional
import httpx, json, re, os, random
import redis.asyncio as aioredis
import motor.motor_asyncio
import jwt
from bson import ObjectId

from dj_prompts import (
    build_dj_start_prompt, DJ_START_SYSTEM,
    build_dj_next_prompt,  DJ_NEXT_SYSTEM,
    build_mood_prompt,     DJ_MOOD_SYSTEM,
    get_energy, GENRE_ENERGY,
)

dj_router = APIRouter(prefix="/api/ai/dj", tags=["DJ"])

# ── Config (heredada del entorno) ──────────────────────
OLLAMA_URL  = os.getenv("OLLAMA_URL",  "http://ollama:11434")
MODEL_MAIN  = os.getenv("MODEL_MAIN",  "llama3.2:3b")
MODEL_LIGHT = os.getenv("MODEL_LIGHT", "gemma2:2b")
REDIS_URL   = os.getenv("REDIS_AI_URL","redis://redis-ai:6379")
MONGO_URI   = os.getenv("MONGO_URI")
JWT_SECRET  = os.getenv("JWT_SECRET")
SESSION_TTL = 60 * 60 * 4   # sesión DJ dura 4 horas máximo

# ── Palabras clave de mood (para enriquecimiento semántico) ──
MOOD_KEYWORDS = ["romántico", "nostálgico", "épico", "melancólico", "energético"]

# ── Clientes ───────────────────────────────────────────
redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
mongo_client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db           = mongo_client["Echofy-Music-Data"]
songs_col    = db["Music"]
lyrics_col   = db["lyrics"]


# ══════════════════════════════════════════════════════
#  Helpers internos
# ══════════════════════════════════════════════════════

def decode_token(raw: str) -> dict:
    token = raw.replace("Bearer ", "").strip()
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


async def call_ollama(model: str, prompt: str, system: str = "", as_json: bool = False) -> str:
    """Llama a Ollama y devuelve la respuesta limpia. Puede forzar formato JSON."""
    payload = {"model": model, "prompt": prompt, "stream": False}
    
    if as_json:
        payload["format"] = "json"
    if system:
        payload["system"] = system
        
    async with httpx.AsyncClient(timeout=300.0) as c:
        r = await c.post(f"{OLLAMA_URL}/api/generate", json=payload)
        r.raise_for_status()
        return r.json()["response"].strip()


def parse_json_safe(raw: str) -> Optional[dict]:
    """Extrae y parsea JSON de la respuesta del modelo, tolerante a markdown."""
    try:
        clean = raw.strip().strip("```json").strip("```").strip()
        match = re.search(r'\{.*\}', clean, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return None


def ser(doc: dict) -> dict:
    """Serializa ObjectId a string."""
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


async def get_session(user_id: str) -> Optional[dict]:
    """Obtiene la sesión DJ activa del usuario desde Redis."""
    raw = await redis_client.get(f"dj:session:{user_id}")
    return json.loads(raw) if raw else None


async def save_session(user_id: str, session: dict):
    """Guarda la sesión DJ en Redis con TTL de 4 horas."""
    await redis_client.set(
        f"dj:session:{user_id}",
        json.dumps(session),
        ex=SESSION_TTL,
    )


async def get_lyrics_snippet(song_id: str) -> str:
    """
    Obtiene las primeras líneas de la letra de una canción.
    Devuelve string vacío si no hay letra disponible.
    """
    try:
        doc = await lyrics_col.find_one(
            {"songId": song_id},
            {"plainLyrics": 1}
        )
        if doc and doc.get("plainLyrics"):
            # Solo las primeras 3 líneas para no saturar el prompt
            lines = [l.strip() for l in doc["plainLyrics"].split("\n") if l.strip()]
            return " / ".join(lines[:3])
    except Exception:
        pass
    return ""


async def get_candidates(
    exclude_ids:    list,
    energy_target:  int = 5,
    genres_hint:    list = None,
    mood_keywords:  list = None,
    limit:          int = 25,
) -> list:
    """
    Obtiene canciones candidatas para el DJ.
    Ahora incluye audioFeatures y semanticAnalysis para que
    el modelo pueda elegir semánticamente.
    """
    exc = []
    for eid in exclude_ids:
        try:
            exc.append(ObjectId(str(eid)))
        except Exception:
            pass
 
    base_filter = {
        "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
        "_id":    {"$nin": exc},
    }
 
    # Campos a incluir — ahora con audioFeatures
    projection = {
        "_id": 1, "title": 1, "artist": 1, "genre": 1,
        "artwork": 1, "driveId": 1, "playCount": 1, "likeCount": 1,
        "audioFeatures": 1,   # ← tempoBPM, energyLevel, vibeTag
    }
 
    candidates = []
 
    # Intentar primero con géneros sugeridos
    if genres_hint:
        genre_pats = [re.compile(re.escape(g), re.IGNORECASE) for g in genres_hint]
        cursor = songs_col.find(
            {**base_filter, "genre": {"$in": genre_pats}}, projection
        ).limit(limit)
        candidates = await cursor.to_list(length=limit)
 
    # Completar con canciones generales si hay pocas
    if len(candidates) < 10:
        cursor = songs_col.find(base_filter, projection).limit(limit * 2)
        extra  = await cursor.to_list(length=limit * 2)
        existing_ids = {str(c["_id"]) for c in candidates}
        candidates  += [s for s in extra if str(s["_id"]) not in existing_ids]
 
    # Para cada candidata, enriquecer con semanticAnalysis desde lyrics
    candidate_ids = [str(c["_id"]) for c in candidates]
    lyrics_cursor = lyrics_col.find(
        {"songId": {"$in": candidate_ids}},
        {"songId": 1, "semanticAnalysis": 1}
    )
    lyrics_docs = await lyrics_cursor.to_list(length=len(candidates))
    lyrics_map  = {doc["songId"]: doc.get("semanticAnalysis") for doc in lyrics_docs}
 
    # Añadir semanticAnalysis a cada candidata
    for c in candidates:
        c["semanticAnalysis"] = lyrics_map.get(str(c["_id"]))
 
    # Ordenar: primero las que tienen audioFeatures y semanticAnalysis
    # luego por proximidad al energy_target
    def sort_key(song):
        has_features  = 1 if song.get("audioFeatures") else 0
        has_semantic  = 1 if song.get("semanticAnalysis") else 0
        energy_raw    = song.get("audioFeatures", {}).get("energyLevel", "") if song.get("audioFeatures") else ""
        energy_map    = {"low": 2, "medium": 5, "high": 8}
        energy_num    = energy_map.get(energy_raw, get_energy(song.get("genre", "")))
        energy_dist   = abs(energy_num - energy_target)
        # Priorizar: tiene semantic > tiene features > energía cercana
        return (-has_semantic, -has_features, energy_dist)
 
    candidates.sort(key=sort_key)
    return [ser(c) for c in candidates[:limit]]
 
 
async def find_song_by_name(query: str) -> dict | None:
    """
    Busca una canción exacta por nombre o artista.
    Usado cuando el usuario pide una canción específica al DJ.
    """
    pat = re.compile(re.escape(query), re.IGNORECASE)
    doc = await songs_col.find_one(
        {
            "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
            "$or": [
                {"title":  pat},
                {"artist": pat},
                {"titleNorm": re.compile(re.sub(r"[^a-z0-9]", "", query.lower()))},
            ]
        },
        {
            "_id": 1, "title": 1, "artist": 1, "genre": 1,
            "artwork": 1, "driveId": 1, "audioFeatures": 1,
        }
    )
    return ser(doc) if doc else None


# ══════════════════════════════════════════════════════
#  Modelos de request
# ══════════════════════════════════════════════════════

class DJStartRequest(BaseModel):
    mood: str                       # "estoy programando", "quiero algo energético"

class DJNextRequest(BaseModel):
    current_song_id: str            # ID de la canción que acaba de terminar/saltarse
    listen_signal:   str            # "completed" | "skipped_early" | "skipped_mid"
    progress_pct:    Optional[float] = 100.0  # % de la canción escuchada (0-100)

class DJPlaySongRequest(BaseModel):
    query: str 


# ══════════════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════════════

@dj_router.post("/start")
async def dj_start(req: DJStartRequest, authorization: str = Header(...)):
    payload = decode_token(authorization)
    user_id = payload.get("id")

    # 1. Clasificar mood
    mood_raw  = await call_ollama(MODEL_LIGHT, build_mood_prompt(req.mood), DJ_MOOD_SYSTEM, as_json=True)
    mood_data = parse_json_safe(mood_raw) or {
        "mood":          req.mood,
        "energy_target": 5,
        "genres_hint":   [],
        "context":       "",
    }

    energy_target = int(mood_data.get("energy_target", 5))
    genres_hint   = mood_data.get("genres_hint", [])

    # 2. Obtener candidatas
    candidates = await get_candidates(
        exclude_ids=[],
        energy_target=energy_target,
        genres_hint=genres_hint,
        limit=25,
    )

    if not candidates:
        raise HTTPException(status_code=404, detail="No hay canciones disponibles")

    # 3. El modelo principal elige y se presenta
    prompt   = build_dj_start_prompt(req.mood, candidates)
    dj_raw   = await call_ollama(MODEL_MAIN, prompt, DJ_START_SYSTEM, as_json=False)
    dj_data  = parse_json_safe(dj_raw) or {}

    chosen_id = dj_data.get("song_id") if dj_data else None
    if chosen_id:
        chosen_id = str(chosen_id).strip().replace('"', "").replace("'", "")

    # Buscamos la canción elegida por la IA dentro de nuestros candidatos reales
    chosen_song = next((c for c in candidates if str(c["_id"]) == chosen_id), None)

    # 🚨 SISTEMA ANTI-404: Fallback dinámico si la IA falló o inventó un ID
    if not chosen_song:
        if candidates:
            chosen_song = candidates[0]
            chosen_id = str(chosen_song["_id"])
            intro = f"A ver, arranquemos con un clásico para romper el hielo: '{chosen_song['title']}' de {chosen_song['artist']}. ¡Sube el volumen!"
        else:
            raise HTTPException(status_code=404, detail="No hay canciones disponibles en la base de datos para este mood.")
    else:
        # Si la IA funcionó bien, extraemos la intro que generó ella
        intro = dj_data.get("intro", f"Empezamos la sesión con '{chosen_song['title']}' de {chosen_song['artist']}.")

    # 4. Guardar sesión en Redis usando la variable uniforme chosen_song
    session = {
        "mood":          req.mood,
        "mood_data":     mood_data,
        "energy_target": energy_target,
        "genres_hint":   genres_hint,
        "played_ids":    [chosen_id],
        "current_song":  chosen_song,
        "history": [
            {"song_id": chosen_id, "signal": "started", "title": chosen_song["title"]}
        ],
    }
    await save_session(user_id, session)

    return {
        "song":    chosen_song,
        "intro":   intro,
        "mood":    mood_data.get("mood", req.mood),
        "session": {
            "energy_target": energy_target,
            "genres_hint":   genres_hint,
            "songs_played":  1,
        },
    }

@dj_router.post("/next")
async def dj_next(req: DJNextRequest, authorization: str = Header(...)):
    payload = decode_token(authorization)
    user_id = payload.get("id")

    # 1. Leer sesión
    session = await get_session(user_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No hay sesión DJ activa. Inicia una con /dj/start"
        )

    # 2. Obtener canción anterior (Compatible con String y ObjectId)
    try:
        # Intentamos buscar por String directo primero ya que tu colección usa Strings
        prev_doc = await songs_col.find_one(
            {"_id": req.current_song_id},
            {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1, "playCount": 1}
        )
        
        # Si no lo encuentra, intentamos con ObjectId por si acaso
        if not prev_doc:
            try:
                prev_doc = await songs_col.find_one(
                    {"_id": ObjectId(req.current_song_id)},
                    {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1, "playCount": 1}
                )
            except Exception:
                pass

        prev_song = ser(prev_doc) if prev_doc else session.get("current_song", {})
    except Exception:
        prev_song = session.get("current_song", {})

    # 3. Ajustar energía
    energy_target = session.get("energy_target", 5)
    if req.listen_signal == "completed":
        energy_target = min(9, energy_target + 1)
    elif req.listen_signal == "skipped_early":
        energy_target = max(1, energy_target - 1)

    # 4. Obtener letra anterior
    lyrics_snippet = await get_lyrics_snippet(req.current_song_id)

    # 5. Obtener candidatas
    played_ids = session.get("played_ids", [])
    candidates = await get_candidates(
        exclude_ids=played_ids,
        energy_target=energy_target,
        genres_hint=session.get("genres_hint", []),
        limit=25,
    )

    if not candidates:
        played_ids = [req.current_song_id]
        candidates = await get_candidates(
            exclude_ids=played_ids,
            energy_target=energy_target,
            genres_hint=session.get("genres_hint", []),
            limit=25,
        )

    if not candidates:
        raise HTTPException(status_code=404, detail="No hay más canciones disponibles")

    # 6. El modelo elige la siguiente
    prompt  = build_dj_next_prompt(
        prev_song      = prev_song,
        listen_signal  = req.listen_signal,
        session_mood   = session.get("mood", ""),
        candidates     = candidates,
        lyrics_snippet = lyrics_snippet,
    )
    dj_raw  = await call_ollama(MODEL_MAIN, prompt, DJ_NEXT_SYSTEM, as_json=False)
    dj_data = parse_json_safe(dj_raw)

    # 🚨 EXTRACCIÓN Y LIMPIEZA ABSOLUTA DEL ID DE LA IA EN NEXT
    chosen_id  = dj_data.get("song_id") if dj_data else None
    if chosen_id:
        chosen_id = str(chosen_id).strip().replace('"', "").replace("'", "")

    chosen     = next((c for c in candidates if c["_id"] == chosen_id), None)

    # Fallback seguro corrigiendo el bug del chosen_id corrupto
    if not chosen:
        chosen     = candidates[0]
        chosen_id  = chosen["_id"]  # 👈 CORREGIDO: Usamos el ID limpio real de la BD
        transition = f"Seguimos con '{chosen['title']}' de {chosen['artist']}."
        energy_delta = "same"
    else:
        transition   = dj_data.get("transition", f"Ahora '{chosen['title']}'.")
        energy_delta = dj_data.get("energy_delta", "same")

    # 7. Actualizar sesión
    played_ids.append(chosen_id)
    session["played_ids"]    = played_ids
    session["current_song"]  = chosen
    session["energy_target"] = energy_target
    session["history"].append({
        "song_id": chosen_id,
        "signal":  req.listen_signal,
        "title":   chosen["title"],
    })
    if len(session["history"]) > 50:
        session["history"] = session["history"][-50:]

    await save_session(user_id, session)

    return {
        "song":         chosen,
        "transition":   transition,
        "energy_delta": energy_delta,
        "session": {
            "energy_target": energy_target,
            "songs_played":  len(played_ids),
            "mood":          session.get("mood_data", {}).get("mood", ""),
        },
    }

@dj_router.post("/play-song")
async def dj_play_song(req: DJPlaySongRequest, authorization: str = Header(...)):
    """
    El usuario pide una canción específica al DJ.
    Busca por nombre/artista y la devuelve inmediatamente
    sin consultar al modelo.
    
    Ejemplo: { "query": "505 arctic monkeys" }
    """
    payload = decode_token(authorization)
    user_id = payload.get("id")
 
    # Buscar en Mongo por título o artista
    query   = req.query.strip()
    words   = query.split()
    pat     = re.compile(re.escape(query), re.IGNORECASE)
    any_pat = re.compile("|".join(re.escape(w) for w in words if len(w) > 2), re.IGNORECASE)
 
    # Intentar match exacto primero
    song = await songs_col.find_one(
        {
            "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
            "$or": [
                {"title":      pat},
                {"artist":     pat},
                {"titleNorm":  re.compile(re.sub(r"[^a-z0-9]", "", query.lower()))},
                {"artistNorm": re.compile(re.sub(r"[^a-z0-9]", "", query.lower()))},
            ]
        },
        {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1, "audioFeatures": 1}
    )
 
    # Si no hay match exacto, buscar por palabras individuales
    if not song and len(words) > 1:
        song = await songs_col.find_one(
            {
                "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
                "$or": [
                    {"title":  any_pat},
                    {"artist": any_pat},
                ]
            },
            {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1, "audioFeatures": 1}
        )
 
    if not song:
        raise HTTPException(
            status_code=404,
            detail=f'No encontré "{query}" en la biblioteca. ¿Quieres que la busque en YouTube?'
        )
 
    song = ser(song)
 
    # Si hay sesión DJ activa, añadir la canción al historial
    session = await get_session(user_id)
    if session:
        session["played_ids"].append(str(song["_id"]))
        session["current_song"] = song
        session["history"].append({
            "song_id": str(song["_id"]),
            "signal":  "manual_request",
            "title":   song["title"],
        })
        await save_session(user_id, session)
 
    return {
        "song":       song,
        "transition": f'Claro, ponemos "{song["title"]}" de {song["artist"]} ahora mismo. 🎵',
        "found":      True,
    }
 

@dj_router.get("/session")
async def dj_session(authorization: str = Header(...)):
    """Devuelve el estado actual de la sesión DJ."""
    payload = decode_token(authorization)
    user_id = payload.get("id")
    session = await get_session(user_id)

    if not session:
        return {"active": False}

    return {
        "active":        True,
        "mood":          session.get("mood", ""),
        "energy_target": session.get("energy_target", 5),
        "songs_played":  len(session.get("played_ids", [])),
        "current_song":  session.get("current_song"),
        "genres_hint":   session.get("genres_hint", []),
    }


@dj_router.post("/queue")
async def dj_queue(req: DJNextRequest, authorization: str = Header(...)):
    """Devuelve un lote de canciones para pre-cargar la cola local del cliente."""
    payload = decode_token(authorization)
    user_id = payload.get("id")

    session = await get_session(user_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail="No hay sesión DJ activa. Inicia una con /dj/start"
        )

    # Ajustar energía según señal
    energy_target = session.get("energy_target", 5)
    if req.listen_signal == "completed":
        energy_target = min(9, energy_target + 1)
    elif req.listen_signal == "skipped_early":
        energy_target = max(1, energy_target - 1)

    # Obtener candidatos excluidos en esta sesión
    played_ids = session.get("played_ids", [])
    candidates = await get_candidates(
        exclude_ids=played_ids,
        energy_target=energy_target,
        genres_hint=session.get("genres_hint", []),
        limit=25,
    )

    if not candidates:
        return {"songs": []}

    # Devolver N canciones de la cola (sin generación de IA, solo música)
    queue_count = req.progress_pct if isinstance(req.progress_pct, int) else 10
    queue_count = min(queue_count, len(candidates))

    return {"songs": candidates[:queue_count]}


@dj_router.delete("/session")
async def dj_end(authorization: str = Header(...)):
    """Termina la sesión DJ activa."""
    payload = decode_token(authorization)
    user_id = payload.get("id")
    await redis_client.delete(f"dj:session:{user_id}")
    return {"ok": True, "message": "Sesión DJ terminada"}