"""
Echofy Ingestor Service
────────────────────────
Puerto interno: 8000

No expuesto al exterior directamente.
Solo el AI service y (futuro) el módulo premium lo llaman vía HTTP.

Endpoints:
  GET  /health
  POST /ingest          → inicia ingesta en background, devuelve job_id
  GET  /status/{job_id} → estado del job en curso
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, re, hashlib, uuid, requests
from datetime import datetime
from pymongo import MongoClient, ASCENDING
from pymongo.errors import DuplicateKeyError
import yt_dlp
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

app = FastAPI(title="Echofy Ingestor")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config ─────────────────────────────────────────────
MONGO_URI    = os.getenv("MONGO_URI")
FOLDER_ID    = os.getenv("DRIVE_FOLDER_ID", "1x4BC6G30IP0EqfB9HRIWN7s_o53oYz1j")
SA_FILE      = os.getenv("SERVICE_ACCOUNT_FILE", "service-account.json")
DOWNLOAD_DIR = "downloads"
os.makedirs(DOWNLOAD_DIR, exist_ok=True)

# ── MongoDB ─────────────────────────────────────────────
mongo_client = MongoClient(MONGO_URI)
db           = mongo_client["Echofy-Music-Data"]
songs_col    = db["musics"]   # ← ajusta si tu colección tiene otro nombre

# Índices de idempotencia (no falla si ya existen)
songs_col.create_index([("youtubeId",   ASCENDING)], unique=True)
songs_col.create_index([("titleNorm", ASCENDING), ("artistNorm", ASCENDING)], unique=True)

# ── Google Drive (Service Account) ─────────────────────
def get_drive_service():
    creds = service_account.Credentials.from_service_account_file(
        SA_FILE,
        scopes=["https://www.googleapis.com/auth/drive"],
    )
    return build("drive", "v3", credentials=creds)

drive_service = get_drive_service()

# ── Estado de jobs en memoria ──────────────────────────
# { job_id: { status, processed, total, errors, url } }
jobs: dict[str, dict] = {}


# ══════════════════════════════════════════════════════
#  Utilidades (igual que tu script original)
# ══════════════════════════════════════════════════════

def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())

def clean_title(title: str) -> str:
    title = re.sub(r"\(.*?\)|\[.*?\]", "", title)
    title = re.sub(
        r"official|video|audio|lyrics|remastered|hd",
        "", title, flags=re.IGNORECASE,
    )
    return title.strip()

def file_hash(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()

def upload_to_drive(file_path: str, file_name: str) -> str:
    metadata = {"name": file_name, "parents": [FOLDER_ID]}
    media    = MediaFileUpload(file_path, mimetype="audio/mpeg", resumable=True)
    result   = drive_service.files().create(
        body=metadata,
        media_body=media,
        fields="id",
        supportsAllDrives=True,
    ).execute()
    return result.get("id")

def file_exists_in_drive(file_name: str) -> bool:
    query   = f"name='{file_name}' and '{FOLDER_ID}' in parents and trashed=false"
    results = drive_service.files().list(q=query, fields="files(id)").execute()
    return len(results.get("files", [])) > 0

def enrich_metadata(title: str, artist: str) -> dict | None:
    """Enriquece metadata desde iTunes API."""
    try:
        url  = (
            "https://itunes.apple.com/search"
            f"?term={requests.utils.quote(f'{title} {artist}')}"
            "&entity=song&limit=1"
        )
        data = requests.get(url, timeout=5).json()
        if data.get("resultCount", 0) > 0:
            s       = data["results"][0]
            artwork = (s.get("artworkUrl100") or "").replace("100x100", "600x600")
            return {
                "title":   s.get("trackName"),
                "artist":  s.get("artistName"),
                "album":   s.get("collectionName"),
                "genre":   s.get("primaryGenreName"),
                "year":    (s.get("releaseDate") or "")[:4],
                "artwork": artwork,
                "source":  "itunes",
            }
    except Exception as e:
        print(f"⚠️ iTunes error: {e}")
    return None


# ══════════════════════════════════════════════════════
#  Procesamiento de una entrada
# ══════════════════════════════════════════════════════

def process_entry(entry: dict, genre: str, yt_id: str, job_id: str):
    """Procesa un video de YouTube: sube a Drive y guarda en Mongo."""
    title_raw   = entry.get("title", "") or ""
    artist_raw  = entry.get("uploader", "") or ""
    title_clean = clean_title(title_raw)
    title_norm  = normalize(title_clean)
    artist_norm = normalize(artist_raw)
    file_name   = f"{title_raw}.mp3"
    file_path   = os.path.join(DOWNLOAD_DIR, file_name)

    if not os.path.exists(file_path):
        jobs[job_id]["errors"].append(f"Archivo no encontrado: {file_name}")
        return

    # Duplicado por metadata
    if songs_col.find_one({"titleNorm": title_norm, "artistNorm": artist_norm}):
        print(f"⏭️ Duplicado metadata: {title_clean}")
        try: os.remove(file_path)
        except: pass
        return

    try:
        fhash = file_hash(file_path)

        # Duplicado por hash de archivo
        if songs_col.find_one({"fileHash": fhash}):
            print(f"⏭️ Duplicado hash: {file_name}")
            os.remove(file_path)
            return

        # Subir a Drive
        drive_id = None
        if not file_exists_in_drive(file_name):
            drive_id = upload_to_drive(file_path, file_name)
            print(f"☁️  Subido a Drive: {file_name} → {drive_id}")
        else:
            print(f"⏭️ Ya en Drive: {file_name}")

        # Enriquecer metadata desde iTunes
        meta = enrich_metadata(title_clean, artist_raw)
        data = meta if meta else {
            "title":  title_clean,
            "artist": artist_raw,
            "genre":  genre,
            "source": "fallback",
        }

        doc = {
            **data,
            "youtubeId":  yt_id,
            "titleNorm":  normalize(data["title"]),
            "artistNorm": normalize(data["artist"]),
            "fileHash":   fhash,
            "driveId":    drive_id,
            "status":     "complete",
            "playCount":  0,
            "likeCount":  0,
            "createdAt":  datetime.utcnow(),
        }

        songs_col.insert_one(doc)
        jobs[job_id]["processed"] += 1
        print(f"✅ Guardado: {doc['title']} — {doc['artist']}")
        os.remove(file_path)

    except DuplicateKeyError:
        print(f"⏭️ Duplicado índice único: {title_clean}")
        try: os.remove(file_path)
        except: pass

    except Exception as e:
        jobs[job_id]["errors"].append(f"{title_clean}: {str(e)}")
        print(f"❌ Error procesando {file_name}: {e}")


# ══════════════════════════════════════════════════════
#  Proceso de ingesta completo (corre en background)
# ══════════════════════════════════════════════════════

def run_ingest(job_id: str, url: str, genre: str):
    """
    Descarga, procesa y sube al sistema todas las canciones de la URL.
    Se ejecuta en un thread de background — no bloquea FastAPI.
    """
    jobs[job_id]["status"] = "running"
    print(f"🚀 Job {job_id} iniciado: {url}")

    ydl_opts = {
        "format":       "bestaudio/best",
        "ignoreerrors": True,
        "postprocessors": [{
            "key":              "FFmpegExtractAudio",
            "preferredcodec":   "mp3",
            "preferredquality": "192",
        }],
        "outtmpl":  f"{DOWNLOAD_DIR}/%(title)s.%(ext)s",
        "quiet":    True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            # Paso 1: obtener metadata sin descargar
            print(f"🔎 Obteniendo metadata...")
            info    = ydl.extract_info(url, download=False)
            entries = info.get("entries", [info])
            entries = [e for e in entries if e]
            jobs[job_id]["total"] = len(entries)

            # Paso 2: filtrar ya existentes
            to_download = []
            for e in entries:
                yt_id = e.get("id")
                if yt_id and songs_col.find_one({"youtubeId": yt_id}):
                    print(f"⏭️ Ya existe: {yt_id}")
                else:
                    to_download.append(e.get("webpage_url") or e.get("url"))

            print(f"⬇️ Descargando {len(to_download)} canciones nuevas...")
            if to_download:
                ydl.download([u for u in to_download if u])

            # Paso 3: procesar archivos descargados
            for entry in entries:
                yt_id = entry.get("id")
                process_entry(entry, genre, yt_id, job_id)

        jobs[job_id]["status"] = "done"
        print(f"✅ Job {job_id} completado: {jobs[job_id]['processed']} canciones")

    except Exception as e:
        jobs[job_id]["status"] = "error"
        jobs[job_id]["errors"].append(str(e))
        print(f"❌ Job {job_id} falló: {e}")


# ══════════════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════════════

class IngestRequest(BaseModel):
    url:   str
    genre: str = "Unknown"


@app.get("/health")
def health():
    active_jobs = sum(1 for j in jobs.values() if j["status"] == "running")
    return {
        "status":      "ok",
        "service":     "ingestor",
        "active_jobs": active_jobs,
    }


@app.post("/ingest")
async def start_ingest(req: IngestRequest, background_tasks: BackgroundTasks):
    """
    Inicia la ingesta en background.
    Responde inmediatamente con job_id para consultar el progreso.
    """
    # Validación básica de URL
    if not ("youtube.com" in req.url or "youtu.be" in req.url):
        raise HTTPException(
            status_code=400,
            detail="Solo se admiten URLs de YouTube por ahora.",
        )

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status":    "queued",
        "processed": 0,
        "total":     0,
        "errors":    [],
        "url":       req.url,
        "genre":     req.genre,
    }

    background_tasks.add_task(run_ingest, job_id, req.url, req.genre)

    return {
        "ok":      True,
        "job_id":  job_id,
        "message": "Ingesta iniciada. Las canciones estarán disponibles en unos minutos.",
    }


@app.get("/status/{job_id}")
def get_status(job_id: str):
    """Devuelve el estado actual de un job de ingesta."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job no encontrado")
    return {"job_id": job_id, **job}


@app.get("/jobs")
def list_jobs():
    """Lista todos los jobs activos o recientes (útil para debug)."""
    return {
        "total": len(jobs),
        "jobs":  [
            {"job_id": jid, "status": j["status"], "processed": j["processed"],
             "total": j["total"], "url": j["url"]}
            for jid, j in jobs.items()
        ],
    }