"""
Echofy DJ — Router
───────────────────
Endpoints del modo DJ de sesión autónomo.
Se monta en main.py con: app.include_router(dj_router)

Endpoints:
  POST /api/ai/dj/start        → inicia sesión DJ con mood del usuario
  POST /api/ai/dj/next         → siguiente canción + narración de transición
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
#MODEL_MAIN  = os.getenv("MODEL_MAIN",  "llama3.2:3b")
MODEL_MAIN  = os.getenv("MODEL_MAIN",  "gemma2:2b")
MODEL_LIGHT = os.getenv("MODEL_LIGHT", "gemma2:2b")
REDIS_URL   = os.getenv("REDIS_AI_URL","redis://redis-ai:6379")
MONGO_URI   = os.getenv("MONGO_URI")
JWT_SECRET  = os.getenv("JWT_SECRET")
SESSION_TTL = 60 * 60 * 4   # sesión DJ dura 4 horas máximo

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
        
    async with httpx.AsyncClient(timeout=120.0) as c:
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
    exclude_ids: list,
    energy_target: int = 5,
    genres_hint: list = None,
    limit: int = 25,
) -> list:
    """
    Obtiene canciones candidatas para el DJ.
    Prioriza canciones cercanas al energy_target y géneros sugeridos.
    Excluye las ya reproducidas en la sesión.
    """
    # Convertir IDs excluidos a ObjectId
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

    # Intentar primero con géneros sugeridos
    candidates = []
    if genres_hint:
        genre_pats = [re.compile(re.escape(g), re.IGNORECASE) for g in genres_hint]
        cursor = songs_col.find(
            {**base_filter, "genre": {"$in": genre_pats}},
            {"_id": 1, "title": 1, "artist": 1, "genre": 1,
             "artwork": 1, "driveId": 1, "playCount": 1, "likeCount": 1}
        ).limit(limit)
        candidates = await cursor.to_list(length=limit)

    # Completar con canciones generales si hay pocas
    if len(candidates) < 10:
        cursor = songs_col.find(
            base_filter,
            {"_id": 1, "title": 1, "artist": 1, "genre": 1,
             "artwork": 1, "driveId": 1, "playCount": 1, "likeCount": 1}
        ).limit(limit * 2)
        extra = await cursor.to_list(length=limit * 2)
        # Evitar duplicados
        existing_ids = {str(c["_id"]) for c in candidates}
        candidates += [s for s in extra if str(s["_id"]) not in existing_ids]

    # Ordenar por proximidad al energy_target
    def energy_distance(song):
        e = get_energy(song.get("genre", ""))
        return abs(e - energy_target)

    candidates.sort(key=energy_distance)
    return [ser(s) for s in candidates[:limit]]


# ══════════════════════════════════════════════════════
#  Modelos de request
# ══════════════════════════════════════════════════════

class DJStartRequest(BaseModel):
    mood: str                       # "estoy programando", "quiero algo energético"

class DJNextRequest(BaseModel):
    current_song_id: str            # ID de la canción que acaba de terminar/saltarse
    listen_signal:   str            # "completed" | "skipped_early" | "skipped_mid"
    progress_pct:    Optional[float] = 100.0  # % de la canción escuchada (0-100)

class DJQueueRequest(BaseModel):
    current_song_id: str
    listen_signal:   str   = "completed"
    count:           int   = 10

class DJSignalRequest(BaseModel):
    songId:      str
    signal:      str          # "completed" | "skipped_early" | "skipped_mid"
    progressPct: float = 100.0


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

    pre_queue = []
    try:
        queue_candidates = await get_candidates(
            exclude_ids   = [chosen_id],   # excluir la primera canción
            energy_target = energy_target,
            genres_hint   = genres_hint,
            limit         = 30,
        )
 
        # Pedir al modelo ligero que ordene las siguientes canciones
        queue_system = "Responde ÚNICAMENTE con JSON. Formato: {\"song_ids\": [\"id1\", \"id2\", ...]}"
        queue_list   = "\\n".join(
            f'- id:{c["_id"]} | "{c["title"]}" de {c["artist"]} | energy:{get_energy(c.get("genre",""))}'
            for c in queue_candidates[:20]
        )
        queue_prompt = f'Mood: "{req.mood}", Energy: {energy_target}/9. Ordena 10 canciones óptimas:\\n{queue_list}'
 
        queue_raw    = await call_ollama(MODEL_LIGHT, queue_prompt, queue_system, as_json=True)
        queue_parsed = parse_json_safe(queue_raw)
        queue_ids    = queue_parsed.get("song_ids", []) if queue_parsed else []
        id_map       = {str(c["_id"]): c for c in queue_candidates}
 
        for sid in queue_ids:
            sid_clean = str(sid).strip().replace('"','').replace("'","")
            if sid_clean in id_map and len(pre_queue) < 10:
                pre_queue.append(id_map[sid_clean])
 
        # Completar con candidatos directos si el modelo no eligió suficientes
        if len(pre_queue) < 10:
            existing = {str(s["_id"]) for s in pre_queue}
            for c in queue_candidates:
                if str(c["_id"]) not in existing and len(pre_queue) < 10:
                    pre_queue.append(c)
 
        # Actualizar played_ids con toda la cola generada
        session["played_ids"] = [chosen_id] + [str(s["_id"]) for s in pre_queue]
        await save_session(user_id, session)
 
    except Exception as e:
        print(f"[DJ] Error generando cola inicial: {e}")
 
    # Añadir 'queue' al return del /start:
    return {
        "song":    chosen_song,
        "queue":   pre_queue,        # ← NUEVO
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
 
 
@dj_router.post("/signal")
async def dj_signal(req: DJSignalRequest, authorization: str = Header(...)):
    """
    Recibe la señal de comportamiento del player y actualiza
    el energy_target de la sesión DJ activa.
    Llamado por el servicio player en background — no bloquea el reproductor.
    """
    payload = decode_token(authorization)
    user_id = payload.get("id")
 
    session = await get_session(user_id)
    if not session:
        # Sin sesión activa — no hay nada que actualizar
        return {"ok": True, "active": False}
 
    # Ajustar energy_target según la señal
    energy_target = session.get("energy_target", 5)
    if req.signal == "completed":
        energy_target = min(9, energy_target + 1)
    elif req.signal == "skipped_early":
        energy_target = max(1, energy_target - 1)
    # skipped_mid → mantener
 
    session["energy_target"] = energy_target
    session["last_signal"]   = req.signal
    await save_session(user_id, session)
 
    return {
        "ok":            True,
        "active":        True,
        "energy_target": energy_target,
        "signal":        req.signal,
    }

@dj_router.post("/queue")
async def dj_queue(req: DJQueueRequest, authorization: str = Header(...)):
    """
    Genera un lote de N canciones para la cola del DJ.
    Se llama cuando la cola local del frontend queda con ≤ 3 canciones.
    No genera narración — solo devuelve canciones ordenadas por energía.
    El modelo ligero elige rápido sin necesidad del modelo principal.
    """
    payload = decode_token(authorization)
    user_id = payload.get("id")
 
    session = await get_session(user_id)
    if not session:
        raise HTTPException(status_code=404, detail="No hay sesión DJ activa")
 
    energy_target = session.get("energy_target", 5)
    played_ids    = session.get("played_ids", [])
    genres_hint   = session.get("genres_hint", [])
 
    candidates = await get_candidates(
        exclude_ids   = played_ids,
        energy_target = energy_target,
        genres_hint   = genres_hint,
        limit         = req.count * 3,   # margen para el modelo
    )
 
    if not candidates:
        # Resetear played_ids y volver a intentar
        played_ids = [req.current_song_id]
        candidates = await get_candidates(
            exclude_ids   = played_ids,
            energy_target = energy_target,
            genres_hint   = genres_hint,
            limit         = req.count * 3,
        )
 
    if not candidates:
        raise HTTPException(status_code=404, detail="No hay más canciones")
 
    # Usar el modelo ligero para ordenar/filtrar los candidatos
    # Si falla, devolvemos los primeros N directamente (ya están ordenados por energía)
    system = """Eres un DJ que selecciona canciones para una sesión.
Responde ÚNICAMENTE con JSON válido, sin texto adicional.
Formato: {"song_ids": ["id1", "id2", "id3", ...]}
Selecciona los IDs en el orden óptimo para la sesión."""
 
    songs_list = "\n".join(
        f'- id:{c["_id"]} | "{c["title"]}" de {c["artist"]} | {c.get("genre","?")} | energy:{get_energy(c.get("genre",""))}'
        for c in candidates[:req.count * 2]
    )
 
    prompt = f"""Sesión DJ — Mood: "{session.get('mood', '')}", Energy target: {energy_target}/9
 
Canciones disponibles:
{songs_list}
 
Selecciona exactamente {req.count} canciones en orden óptimo para la sesión."""
 
    chosen_songs = []
    try:
        raw     = await call_ollama(MODEL_LIGHT, prompt, system, as_json=True)
        parsed  = parse_json_safe(raw)
        ids     = parsed.get("song_ids", []) if parsed else []
        id_map  = {str(c["_id"]): c for c in candidates}
 
        for sid in ids:
            sid_clean = str(sid).strip().replace('"', '').replace("'", "")
            if sid_clean in id_map and len(chosen_songs) < req.count:
                chosen_songs.append(id_map[sid_clean])
    except Exception:
        pass
 
    # Fallback: completar con candidatos directos si el modelo no eligió suficientes
    if len(chosen_songs) < req.count:
        existing = {str(s["_id"]) for s in chosen_songs}
        for c in candidates:
            if str(c["_id"]) not in existing and len(chosen_songs) < req.count:
                chosen_songs.append(c)
 
    # Actualizar played_ids en la sesión
    new_ids = [str(s["_id"]) for s in chosen_songs]
    session["played_ids"] = played_ids + new_ids
    await save_session(user_id, session)
 
    return {
        "songs": chosen_songs,
        "count": len(chosen_songs),
        "energy_target": energy_target,
    }

@dj_router.delete("/session")
async def dj_end(authorization: str = Header(...)):
    """Termina la sesión DJ activa."""
    payload = decode_token(authorization)
    user_id = payload.get("id")
    await redis_client.delete(f"dj:session:{user_id}")
    return {"ok": True, "message": "Sesión DJ terminada"}