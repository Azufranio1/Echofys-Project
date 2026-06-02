
"""
Skill: iTunes Search
─────────────────────
Busca metadata oficial en iTunes.
Se usa para enriquecer resultados y mostrar canciones fuera del sistema.
"""
import httpx

ITUNES_SEARCH_URL = "https://itunes.apple.com/search"


async def search_itunes(query: str, limit: int = 5) -> list:
    """
    Busca canciones en iTunes y devuelve metadata oficial.
    """
    params = {
        "term":   query,
        "entity": "song",
        "limit":  limit,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(ITUNES_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("results", []):
        artwork = (item.get("artworkUrl100") or "").replace("100x100bb", "600x600bb")
        results.append({
            "title":      item.get("trackName", ""),
            "artist":     item.get("artistName", ""),
            "album":      item.get("collectionName", ""),
            "genre":      item.get("primaryGenreName", ""),
            "year":       (item.get("releaseDate") or "")[:4],
            "artwork":    artwork,
            "previewUrl": item.get("previewUrl", ""),   # preview 30s
            "trackId":    item.get("trackId"),
            "source":     "itunes",
        })

    return results


async def enrich_metadata(title: str, artist: str) -> dict | None:
    """
    Enriquece metadata de una canción con datos de iTunes.
    Devuelve None si no encuentra nada.
    """
    results = await search_itunes(f"{title} {artist}", limit=1)
    return results[0] if results else None