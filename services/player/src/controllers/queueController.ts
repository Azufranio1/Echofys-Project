import { Request, Response } from 'express';
import RecentlyPlayed from '../models/RecentlyPlayed';
import { Music } from '../models/Music';
import { cacheGet, cacheSet, cacheDel, CACHE_KEYS, TTL } from '../lib/cache';

const MAX_HISTORY  = 100;
const statusFilter = { status: { $regex: /^\s*complete\s*$/i } };

/* ── POST /api/queue/played ── */
export const registerPlay = async (req: Request, res: Response) => {
  try {
    const userId  = req.user.id;
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ message: 'songId requerido' });

    await RecentlyPlayed.findOneAndUpdate(
      { userId },
      { $push: { plays: { $each: [{ songId, playedAt: new Date() }], $position: 0, $slice: MAX_HISTORY } } },
      { upsert: true, new: true }
    );

    await Music.findByIdAndUpdate(songId, { $inc: { playCount: 1 } });

    // Invalidar caché del home y stats del usuario (datos frescos)
    await cacheDel(CACHE_KEYS.homeData(userId), CACHE_KEYS.userStats(userId));

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('registerPlay error:', err);
    return res.status(500).json({ message: 'Error al registrar reproducción' });
  }
};

/* ── GET /api/queue/next?songId=xxx ── */
export const getNextQueue = async (req: Request, res: Response) => {
  try {
    const userId     = req.user.id;
    const { songId } = req.query as { songId: string };
    if (!songId) return res.status(400).json({ message: 'songId requerido' });

    const current = await Music.findById(songId);
    if (!current) return res.status(404).json({ message: 'Canción no encontrada' });

    const { artist, genre, _id: currentId } = current as any;
    const history   = await RecentlyPlayed.findOne({ userId });
    const recentIds = history
      ? history.plays.slice(0, 20).map((p: any) => p.songId.toString()).filter((id: string) => id !== currentId.toString())
      : [];

    const selected = new Set<string>([currentId.toString()]);
    const shuffle  = <T>(arr: T[]): T[] => [...arr].sort(() => Math.random() - 0.5);
    const collect  = (songs: any[], n: number): any[] => {
      const result: any[] = [];
      for (const s of shuffle(songs)) {
        const id = s._id.toString();
        if (!selected.has(id)) { selected.add(id); result.push(s); if (result.length === n) break; }
      }
      return result;
    };

    const [byArtist, byGenre, recentSongs, exploreSongs] = await Promise.all([
      Music.find({ artist: { $regex: new RegExp(artist, 'i') }, ...statusFilter, _id: { $ne: currentId } }).limit(20),
      Music.find({ genre:  { $regex: new RegExp(genre || '', 'i') }, ...statusFilter, _id: { $ne: currentId } }).limit(20),
      recentIds.length ? Music.find({ _id: { $in: recentIds } }).limit(20) : Promise.resolve([]),
      Music.find({ ...statusFilter, _id: { $ne: currentId } }).limit(50),
    ]);

    const artistPicks  = collect(byArtist,    2);
    const genrePicks   = collect(byGenre,     2);
    const recentPicks  = collect(recentSongs, 2);
    const explorePicks = collect(exploreSongs,2);

    return res.json({
      queue: [...artistPicks, ...genrePicks, ...recentPicks, ...explorePicks],
      meta:  { artist: artistPicks.length, genre: genrePicks.length, recent: recentPicks.length, explore: explorePicks.length },
    });
  } catch (err) {
    console.error('getNextQueue error:', err);
    return res.status(500).json({ message: 'Error al generar cola' });
  }
};

/* ── GET /api/queue/recent ── */
export const getRecentlyPlayed = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(Number(req.query.limit) || 20, 50);

    const history = await RecentlyPlayed.findOne({ userId })
      .populate({ path: 'plays.songId', model: 'Music' });
    if (!history) return res.json([]);

    const seen  = new Set<string>();
    const plays = history.plays
      .filter((p: any) => { const id = p.songId?._id?.toString(); if (!id || seen.has(id)) return false; seen.add(id); return true; })
      .slice(0, limit)
      .map((p: any) => ({ song: p.songId, playedAt: p.playedAt }));

    return res.json(plays);
  } catch (err) {
    console.error('getRecentlyPlayed error:', err);
    return res.status(500).json({ message: 'Error al obtener historial' });
  }
};

/* ── GET /api/queue/home ── con caché por usuario + global top cacheado separado ── */
export const getHomeSections = async (req: Request, res: Response) => {
  try {
    const userId   = req.user.id;
    const homeKey  = CACHE_KEYS.homeData(userId);
    const topKey   = CACHE_KEYS.globalTop();
 
    // 1. Caché del home completo
    const cachedHome = await cacheGet<any>(homeKey);
    if (cachedHome) return res.json(cachedHome);
 
    const statusFilter = { status: { $regex: /^\s*complete\s*$/i } };
 
    // 2. Historial del usuario
    const history = await RecentlyPlayed.findOne({ userId })
      .populate({ path: 'plays.songId', model: 'Music' });
 
    const seen = new Set<string>();
    const recentSongs: any[] = [];
 
    if (history) {
      for (const p of history.plays) {
        const song = p.songId as any;
        const id   = song?._id?.toString();
        if (!id || seen.has(id)) continue;
        seen.add(id);
        recentSongs.push(song);
        if (recentSongs.length === 10) break;
      }
    }
 
    // IDs de plays recientes para análisis
    const recentIds = history
      ? history.plays
          .slice(0, 30)
          .map((p: any) => p.songId?._id?.toString() || p.songId?.toString())
          .filter(Boolean)
      : [];
 
    let personalizedRecs: any[] = [];
    let tasteRecs:        any[] = [];
    let listenedGenres:   string[] = [];
 
    if (recentIds.length > 0) {
      const recentDocs = await Music.find({ _id: { $in: recentIds } });
 
      // Contar géneros y artistas
      const genreCount:  Record<string, number> = {};
      const artistCount: Record<string, number> = {};
      recentDocs.forEach((s: any) => {
        if (s.genre)  genreCount[s.genre]   = (genreCount[s.genre]  || 0) + 1;
        if (s.artist) artistCount[s.artist] = (artistCount[s.artist]|| 0) + 1;
      });
 
      listenedGenres = Object.keys(genreCount);
 
      const topArtists = Object.entries(artistCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([a]) => a);
 
      const topGenres = Object.entries(genreCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => g);
 
      // ── Personalizadas: mismo artista ──
      // Escapa caracteres especiales de regex para artistas con símbolos (&, ., etc.)
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
 
      if (topArtists.length > 0) {
        personalizedRecs = await Music.find({
          ...statusFilter,
          _id:    { $nin: [...seen] },
          artist: { $in: topArtists.map(a => new RegExp(escapeRegex(a), 'i')) },
        })
          .sort({ playCount: -1 })
          .limit(20);
      }
 
      // Si no hay suficientes por artista, completa con populares generales
      if (personalizedRecs.length < 5) {
        const extraIds = new Set([...seen, ...personalizedRecs.map((s: any) => s._id.toString())]);
        const extras   = await Music.find({ ...statusFilter, _id: { $nin: [...extraIds] } })
          .sort({ playCount: -1 })
          .limit(20 - personalizedRecs.length);
        personalizedRecs = [...personalizedRecs, ...extras];
      }
 
      // ── Según gustos: mismo género ──
      const excludeP = new Set([...seen, ...personalizedRecs.map((s: any) => s._id.toString())]);
 
      if (topGenres.length > 0) {
        tasteRecs = await Music.find({
          ...statusFilter,
          _id:   { $nin: [...excludeP] },
          genre: { $in: topGenres.map(g => new RegExp(escapeRegex(g), 'i')) },
        })
          .sort({ playCount: -1 })
          .limit(20);
      }
 
      // Fallback si no hay suficientes por género
      if (tasteRecs.length < 5) {
        const excludeT = new Set([...excludeP, ...tasteRecs.map((s: any) => s._id.toString())]);
        const extras   = await Music.find({ ...statusFilter, _id: { $nin: [...excludeT] } })
          .sort({ playCount: -1 })
          .limit(20 - tasteRecs.length);
        tasteRecs = [...tasteRecs, ...extras];
      }
 
    } else {
      // Sin historial — populares como fallback para ambas secciones
      const popular = await Music.find(statusFilter).sort({ playCount: -1 }).limit(40);
      personalizedRecs = popular.slice(0, 20);
      tasteRecs        = popular.slice(20);
    }
 
    // 3. Top 20 global — caché compartida entre usuarios
    let globalTop = await cacheGet<any[]>(topKey);
    if (!globalTop || globalTop.length === 0) {
      globalTop = await Music.find(statusFilter)
        .sort({ likeCount: -1, playCount: -1 })
        .limit(20);
      await cacheSet(topKey, globalTop, TTL.globalTop);
    }
 
    // 4. Explorar géneros nuevos
    const allGenres     = await Music.distinct('genre', statusFilter);
    const newGenres     = allGenres.filter(
      g => g && !listenedGenres.some(lg => lg.toLowerCase() === g.toLowerCase())
    );
    const explorePool   = newGenres.length > 0 ? newGenres : allGenres;
    const shuffled      = [...explorePool].sort(() => Math.random() - 0.5).slice(0, 5);
 
    const explorePerGenre = await Promise.all(
      shuffled.map(genre =>
        Music.find({ ...statusFilter, genre: { $regex: new RegExp(genre, 'i') } })
          .sort({ playCount: -1 })
          .limit(4)
      )
    );
 
    const exploreSet   = new Set<string>();
    const exploreSongs: any[] = [];
    for (const batch of explorePerGenre) {
      for (const s of batch) {
        const id = s._id.toString();
        if (!exploreSet.has(id)) { exploreSet.add(id); exploreSongs.push(s); }
      }
    }
    exploreSongs.sort(() => Math.random() - 0.5);
 
    // 5. Ensamblar respuesta — nombres de keys consistentes con el frontend
    const result = {
      recentSongs,        // Volver a escuchar
      personalizedRecs,   // Recomendado para ti
      tasteRecs,          // Según tus gustos
      globalTop,          // Top 20 global
      exploreSongs,       // Explorar nuevos géneros
    };
 
    await cacheSet(homeKey, result, TTL.home);
    return res.json(result);
 
  } catch (err) {
    console.error('getHomeSections error:', err);
    return res.status(500).json({ message: 'Error al cargar home' });
  }
};