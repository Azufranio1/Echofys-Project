
"""
Skill: YouTube Search
──────────────────────
Busca canciones en YouTube cuando no están en el sistema.
"""
import httpx
import os

YT_API_KEY   = os.getenv("YOUTUBE_API_KEY", "")
YT_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


async def search_youtube(query: str, limit: int = 5) -> list:
    """
    Busca en YouTube y devuelve videoId, título, canal, thumbnail y URL.
    """
    if not YT_API_KEY:
        return []

    params = {
        "part":            "snippet",
        "q":               query,
        "type":            "video",
        "videoCategoryId": "10",      # Música
        "maxResults":      limit,
        "key":             YT_API_KEY,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(YT_SEARCH_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    results = []
    for item in data.get("items", []):
        video_id = item["id"].get("videoId", "")
        snippet  = item.get("snippet", {})
        results.append({
            "videoId":   video_id,
            "title":     snippet.get("title", ""),
            "channel":   snippet.get("channelTitle", ""),
            "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url", ""),
            "url":       f"https://www.youtube.com/watch?v={video_id}",
            "source":    "youtube",
        })

    return results


async def get_playlist_videos(playlist_url: str, limit: int = 50) -> list:
    """
    Obtiene los videos de una playlist de YouTube sin descargarlos.
    Usa yt-dlp en modo metadata solamente.
    """
    try:
        import yt_dlp
        ydl_opts = {
            "quiet":        True,
            "extract_flat": True,
            "playlistend":  limit,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info    = ydl.extract_info(playlist_url, download=False)
            entries = info.get("entries", [])
            return [
                {
                    "videoId": e.get("id", ""),
                    "title":   e.get("title", ""),
                    "url":     e.get("url") or f"https://www.youtube.com/watch?v={e.get('id','')}",
                    "source":  "youtube",
                }
                for e in entries if e
            ]
    except Exception as e:
        return [{"error": str(e)}]