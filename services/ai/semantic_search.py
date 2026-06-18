import httpx
import math
from motor.motor_asyncio import AsyncIOMotorDatabase

EMBED_MODEL = "nomic-embed-text"

async def get_embedding(text: str, ollama_url: str) -> list[float] | None:
    """
    Genera un embedding de 768 dimensiones para el texto dado.
    Usa el mismo modelo que el Ingestor para consistencia.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                f"{ollama_url}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json().get("embedding")
    except Exception as e:
        print(f"[semantic] Error generando embedding: {e}")
        return None

def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Similitud coseno entre dos vectores."""
    dot   = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)

async def semantic_search(
    db:          AsyncIOMotorDatabase,
    query:       str,
    ollama_url:  str,
    limit:       int = 5,
    min_similarity: float = 0.3,   # umbral mínimo para filtrar ruido
) -> list[dict]:
    """
    Busca canciones semánticamente relacionadas con la consulta.
    Solo considera canciones que tengan lyrics_embedding disponible.

    Retorna lista de dicts con:
      - song:       datos de la canción (Music)
      - lyrics:     datos de las letras (lyrics)
      - similarity: score de similitud (0-1)
      - analysis:   semanticAnalysis si existe
    """

    query_embedding = await get_embedding(query, ollama_url)
    if not query_embedding:
        return []

    lyrics_col = db["lyrics"]
    songs_col  = db["Music"]

    cursor = lyrics_col.find(
        {
            "lyrics_embedding": {"$exists": True, "$ne": None},
            "instrumental":     {"$ne": True},
        },
        {
            "songId":           1,
            "lyrics_embedding": 1,
            "semanticAnalysis": 1,
            "plainLyrics":      1,
            "trackName":        1,
            "artistName":       1,
        }
    )
    lyrics_docs = await cursor.to_list(length=500)

    if not lyrics_docs:
        return []

    scored = []
    for doc in lyrics_docs:
        emb = doc.get("lyrics_embedding")
        if not emb or len(emb) != len(query_embedding):
            continue
        sim = cosine_similarity(query_embedding, emb)
        if sim >= min_similarity:
            scored.append({
                "songId":           doc["songId"],
                "similarity":       round(sim, 4),
                "semanticAnalysis": doc.get("semanticAnalysis"),
                "plainLyricsSnip":  " / ".join(
                    [l.strip() for l in (doc.get("plainLyrics") or "").split("\n") if l.strip()][:3]
                ),
            })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    top = scored[:limit]

    if not top:
        return []

    song_ids = [item["songId"] for item in top]
    songs_cursor = songs_col.find(
        {"_id": {"$in": song_ids}},
        {"_id": 1, "title": 1, "artist": 1, "genre": 1,
         "artwork": 1, "driveId": 1, "year": 1, "album": 1,
         "audioFeatures": 1}
    )
    songs_list = await songs_cursor.to_list(length=limit)
    songs_map  = {str(s["_id"]): s for s in songs_list}

    results = []
    for item in top:
        song_data = songs_map.get(str(item["songId"]))
        if not song_data:
            continue
        song_data["_id"] = str(song_data["_id"])
        results.append({
            "song":       song_data,
            "similarity": item["similarity"],
            "analysis":   item["semanticAnalysis"],
            "lyricSnip":  item["plainLyricsSnip"],
        })

    return results

async def explain_results(
    query:   str,
    results: list[dict],
    ollama_url: str,
    model:   str = "gemma2:9b",
) -> str:
    """
    Usa gemma2:9b para explicar por qué cada canción es relevante
    para la consulta del usuario.
    """
    if not results:
        return "No encontré canciones que coincidan con esa búsqueda."

    songs_context = "\n".join(
        f'- "{r["song"]["title"]}" de {r["song"]["artist"]} '
        f'(similitud: {r["similarity"]:.0%})\n'
        f'  Tema: {r["analysis"].get("mainTheme","?") if r["analysis"] else "?"}\n'
        f'  Tono emocional: {", ".join(r["analysis"].get("emotionalTone",[]) if r["analysis"] else [])}\n'
        f'  Letra: "{r["lyricSnip"]}"'
        for r in results
    )

    system = """Eres Echofy AI, un asistente musical con profundo conocimiento de letras y emociones.
Explica en 2-3 frases por qué estas canciones son relevantes para lo que busca el usuario.
Sé específico, menciona temas y metáforas de las letras. Responde en español, tono amigable."""

    prompt = f"""El usuario busca: "{query}"

Canciones encontradas por análisis semántico de letras:
{songs_context}

Explica brevemente por qué estas canciones encajan con la búsqueda."""

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(
                f"{ollama_url}/api/generate",
                json={"model": model, "prompt": prompt, "system": system, "stream": False},
            )
            resp.raise_for_status()
            return resp.json()["response"].strip()
    except Exception as e:
        print(f"[semantic] Error generando explicación: {e}")
        return ""