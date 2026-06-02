
"""
Skill: Recommend
────────────────
Busca canciones en MongoDB relacionadas con los gustos del usuario.
"""
import re
import random
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId


async def recommend_from_history(
    songs_col: AsyncIOMotorCollection,
    recent_songs: list,
    limit: int = 10,
    exclude_ids: list = None,
) -> list:
    """
    Dado el historial reciente del usuario, recomienda canciones
    de géneros y artistas similares que no haya escuchado.
    """
    if not recent_songs:
        cursor = songs_col.find(
            {"status": {"$regex": r"^\s*complete\s*$", "$options": "i"}},
            {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1}
        ).sort("playCount", -1).limit(limit)
        results = await cursor.to_list(length=limit)
        return [_ser(s) for s in results]

    genres  = list({s.get("genre",  "") for s in recent_songs if s.get("genre")})
    artists = list({s.get("artist", "") for s in recent_songs if s.get("artist")})

    exc_ids = []
    for s in recent_songs:
        try:
            exc_ids.append(ObjectId(str(s.get("_id", ""))))
        except Exception:
            pass
    if exclude_ids:
        for eid in exclude_ids:
            try:
                exc_ids.append(ObjectId(str(eid)))
            except Exception:
                pass

    genre_pats  = [re.compile(re.escape(g), re.IGNORECASE) for g in genres[:4]]
    artist_pats = [re.compile(re.escape(a), re.IGNORECASE) for a in artists[:4]]

    cursor = songs_col.find(
        {
            "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
            "_id":    {"$nin": exc_ids},
            "$or": [
                {"genre":  {"$in": genre_pats}},
                {"artist": {"$in": artist_pats}},
            ],
        },
        {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1}
    ).limit(limit * 3)

    candidates = await cursor.to_list(length=limit * 3)
    random.shuffle(candidates)
    return [_ser(s) for s in candidates[:limit]]


async def recommend_by_song(
    songs_col: AsyncIOMotorCollection,
    song_id: str,
    limit: int = 8,
) -> list:
    """
    Dado el ID de una canción, recomienda canciones del mismo artista o género.
    """
    try:
        current = await songs_col.find_one({"_id": ObjectId(song_id)})
    except Exception:
        return []

    if not current:
        return []

    artist = current.get("artist", "")
    genre  = current.get("genre",  "")

    cursor = songs_col.find(
        {
            "status": {"$regex": r"^\s*complete\s*$", "$options": "i"},
            "_id":    {"$ne": ObjectId(song_id)},
            "$or": [
                {"artist": re.compile(re.escape(artist), re.IGNORECASE)},
                {"genre":  re.compile(re.escape(genre),  re.IGNORECASE)},
            ],
        },
        {"_id": 1, "title": 1, "artist": 1, "genre": 1, "artwork": 1, "driveId": 1}
    ).limit(limit * 2)

    candidates = await cursor.to_list(length=limit * 2)
    random.shuffle(candidates)
    return [_ser(s) for s in candidates[:limit]]


def _ser(doc: dict) -> dict:
    doc["_id"] = str(doc.get("_id", ""))
    return doc