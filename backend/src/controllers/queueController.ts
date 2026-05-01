import { Request, Response } from 'express';
import RecentlyPlayed from '../models/RecentlyPlayed';
import { Music } from '../models/Music';

const MAX_HISTORY = 100;

/* ─────────────────────────────────────────
   POST /api/queue/played  { songId }
   Registra reproducción + incrementa playCount
───────────────────────────────────────── */
export const registerPlay = async (req: Request, res: Response) => {
  try {
    const userId  = req.user.id;
    const { songId } = req.body;
    if (!songId) return res.status(400).json({ message: 'songId requerido' });

    // Registrar en historial del usuario
    await RecentlyPlayed.findOneAndUpdate(
      { userId },
      {
        $push: {
          plays: {
            $each:     [{ songId, playedAt: new Date() }],
            $position: 0,
            $slice:    MAX_HISTORY,
          },
        },
      },
      { upsert: true, new: true }
    );

    // Incrementar contador global de reproducciones
    await Music.findByIdAndUpdate(songId, { $inc: { playCount: 1 } });

    return res.status(201).json({ ok: true });
  } catch (err) {
    console.error('registerPlay error:', err);
    return res.status(500).json({ message: 'Error al registrar reproducción' });
  }
};

/* ─────────────────────────────────────────
   GET /api/queue/next?songId=xxx
   Cola recomendada: 2 artista + 2 género + 2 recientes + 2 explorar
───────────────────────────────────────── */
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
    const shuffle  = <T>(arr: T[]): T[] => arr.sort(() => Math.random() - 0.5);
    const collect  = (songs: any[], n: number): any[] => {
      const result: any[] = [];
      for (const s of shuffle(songs)) {
        const id = s._id.toString();
        if (!selected.has(id)) { selected.add(id); result.push(s); if (result.length === n) break; }
      }
      return result;
    };

    const statusFilter = { status: { $regex: /^\s*complete\s*$/i } };

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

/* ─────────────────────────────────────────
   GET /api/queue/recent?limit=N
   Historial del usuario deduplicado y populado
───────────────────────────────────────── */
export const getRecentlyPlayed = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(Number(req.query.limit) || 20, 50);

    const history = await RecentlyPlayed.findOne({ userId })
      .populate({ path: 'plays.songId', model: 'Music' });

    if (!history) return res.json([]);

    const seen  = new Set<string>();
    const plays = history.plays
      .filter((p: any) => {
        const id = p.songId?._id?.toString();
        if (!id || seen.has(id)) return false;
        seen.add(id); return true;
      })
      .slice(0, limit)
      .map((p: any) => ({ song: p.songId, playedAt: p.playedAt }));

    return res.json(plays);
  } catch (err) {
    console.error('getRecentlyPlayed error:', err);
    return res.status(500).json({ message: 'Error al obtener historial' });
  }
};

/* ─────────────────────────────────────────
   GET /api/queue/home
   Tres secciones para el home:
     - recentSongs:  últimas 10 únicas del usuario
     - recommended:  20 canciones basadas en gustos recientes
     - trending:     20 más reproducidas globalmente
───────────────────────────────────────── */
// Reemplaza SOLO la función getHomeSections en queueController.ts
// El resto del archivo queda igual.

export const getHomeSections = async (req: Request, res: Response) => {
  try {
    const userId       = req.user.id;
    const statusFilter = { status: { $regex: /^\s*complete\s*$/i } };

    // 1. Historial del usuario
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

    // 2. Géneros y artistas más escuchados (últimas 30 plays)
    const recentIds = history
      ? history.plays.slice(0, 30)
          .map((p: any) => p.songId?._id?.toString() || p.songId?.toString())
          .filter(Boolean)
      : [];

    let recommended: any[] = [];
    let listenedGenres: string[] = [];

    if (recentIds.length > 0) {
      const recentDocs = await Music.find({ _id: { $in: recentIds } });

      const genreCount:  Record<string, number> = {};
      const artistCount: Record<string, number> = {};
      recentDocs.forEach((s: any) => {
        if (s.genre)  genreCount[s.genre]   = (genreCount[s.genre]  || 0) + 1;
        if (s.artist) artistCount[s.artist] = (artistCount[s.artist]|| 0) + 1;
      });

      listenedGenres = Object.keys(genreCount); // todos los géneros escuchados

      const topGenres  = Object.entries(genreCount).sort((a,b) => b[1]-a[1]).slice(0,3).map(([g])=>g);
      const topArtists = Object.entries(artistCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([a])=>a);

      recommended = await Music.find({
        ...statusFilter,
        _id: { $nin: [...seen] },
        $or: [
          { genre:  { $in: topGenres.map(g  => new RegExp(g,  'i')) } },
          { artist: { $in: topArtists.map(a => new RegExp(a, 'i')) } },
        ],
      })
        .sort({ playCount: -1 })
        .limit(20);
    } else {
      recommended = await Music.find(statusFilter).sort({ playCount: -1 }).limit(20);
    }

    // 3. Trending — top 20 por playCount
    const trending = await Music.find(statusFilter)
      .sort({ playCount: -1 })
      .limit(20);

    // 4. Explorar — géneros distintos a los que ya escuchó el usuario, aleatorio
    //    Obtener todos los géneros disponibles en la BD
    const allGenres: string[] = await Music.distinct('genre', statusFilter);

    // Géneros nuevos = los que el usuario NO ha escuchado
    const newGenres = allGenres.filter(
      g => g && !listenedGenres.some(lg => lg.toLowerCase() === g.toLowerCase())
    );

    // Si no hay géneros nuevos (escuchó todo), usar todos mezclados
    const exploreGenres = newGenres.length > 0 ? newGenres : allGenres;

    // Tomar hasta 4 géneros al azar y 4 canciones de cada uno → ~16 canciones variadas
    const shuffled     = exploreGenres.sort(() => Math.random() - 0.5).slice(0, 5);
    const explorePerGenre = await Promise.all(
      shuffled.map(genre =>
        Music.find({
          ...statusFilter,
          genre: { $regex: new RegExp(genre, 'i') },
        })
          .sort({ playCount: -1 }) // las más conocidas de ese género
          .limit(4)
      )
    );

    // Aplanar, deduplicar y mezclar
    const exploreSet  = new Set<string>();
    const exploreSongs: any[] = [];
    for (const batch of explorePerGenre) {
      for (const s of batch) {
        const id = s._id.toString();
        if (!exploreSet.has(id)) {
          exploreSet.add(id);
          exploreSongs.push(s);
        }
      }
    }
    // Mezcla final para que no salgan agrupados por género
    exploreSongs.sort(() => Math.random() - 0.5);

    return res.json({ recentSongs, recommended, trending, exploreSongs });
  } catch (err) {
    console.error('getHomeSections error:', err);
    return res.status(500).json({ message: 'Error al cargar home' });
  }
};