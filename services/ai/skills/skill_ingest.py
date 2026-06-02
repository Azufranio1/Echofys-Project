"""
Skill: Ingest
──────────────
Llama al contenedor del Ingestor vía HTTP para procesar
una URL de YouTube (canción o playlist).
"""
import httpx
import os

INGESTOR_URL = os.getenv("INGESTOR_URL", "http://echofy-ingestor:8000")


async def ingest_url(youtube_url: str, genre: str = "Unknown") -> dict:
    """
    Envía la URL al Ingestor. Responde de inmediato — el proceso
    corre en background dentro del Ingestor.
    """
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{INGESTOR_URL}/ingest",
                json={"url": youtube_url, "genre": genre},
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.ConnectError:
        return {"ok": False, "error": "Ingestor no disponible en este momento"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


async def ingest_status(job_id: str) -> dict:
    """
    Consulta el estado de un trabajo de ingesta en curso.
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{INGESTOR_URL}/status/{job_id}")
            return resp.json()
    except Exception as e:
        return {"status": "unknown", "error": str(e)}