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
 
    // ── 1. Historial del usuario ──
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
 
    // ── 2. Géneros y artistas más escuchados por el usuario ──
    const recentIds = history
      ? history.plays
          .slice(0, 30)
          .map((p: any) => p.songId?._id?.toString() || p.songId?.toString())
          .filter(Boolean)
      : [];
 
    let personalizedRecs: any[] = [];  // recomendaciones personalizadas (gustos exactos)
    let tasteRecs:        any[] = [];  // recomendaciones según gustos amplios
    let listenedGenres:   string[] = [];
 
    if (recentIds.length > 0) {
      const recentDocs = await Music.find({ _id: { $in: recentIds } });
 
      const genreCount:  Record<string, number> = {};
      const artistCount: Record<string, number> = {};
      recentDocs.forEach((s: any) => {
        if (s.genre)  genreCount[s.genre]   = (genreCount[s.genre]  || 0) + 1;
        if (s.artist) artistCount[s.artist] = (artistCount[s.artist]|| 0) + 1;
      });
 
      listenedGenres = Object.keys(genreCount);
 
      const topGenres  = Object.entries(genreCount).sort((a,b) => b[1]-a[1]).slice(0,3).map(([g])=>g);
      const topArtists = Object.entries(artistCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([a])=>a);
 
      // Personalizadas: mismo artista O mismo género top, no escuchadas
      personalizedRecs = await Music.find({
        ...statusFilter,
        _id: { $nin: [...seen] },
        $or: [
          { artist: { $in: topArtists.map(a => new RegExp(`^${a}$`, 'i')) } },
        ],
      })
        .sort({ playCount: -1 })
        .limit(20);
 
      // Según gustos: géneros afines, más amplio
      const excludeAfterPersonalized = new Set([...seen, ...personalizedRecs.map((s:any) => s._id.toString())]);
      tasteRecs = await Music.find({
        ...statusFilter,
        _id: { $nin: [...excludeAfterPersonalized] },
        genre: { $in: topGenres.map(g => new RegExp(g, 'i')) },
      })
        .sort({ playCount: -1 })
        .limit(20);
 
    } else {
      // Sin historial: populares como fallback para ambas secciones
      personalizedRecs = await Music.find(statusFilter).sort({ playCount: -1 }).limit(20);
      tasteRecs        = [];
    }
 
    // ── 3. Top 20 global (por likeCount + playCount combinados) ──
    const globalTop = await Music.find(statusFilter)
      .sort({ likeCount: -1, playCount: -1 })
      .limit(20);
 
    // ── 4. Explorar: géneros distintos a los escuchados ──
    const allGenres   = await Music.distinct('genre', statusFilter);
    const newGenres   = allGenres.filter(
      g => g && !listenedGenres.some(lg => lg.toLowerCase() === g.toLowerCase())
    );
    const exploreGenres = newGenres.length > 0 ? newGenres : allGenres;
    const shuffledGenres = exploreGenres.sort(() => Math.random() - 0.5).slice(0, 5);
 
    const explorePerGenre = await Promise.all(
      shuffledGenres.map(genre =>
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
 
    return res.json({
      recentSongs,       // 1. Volver a escuchar
      personalizedRecs,  // 2. Recomendaciones personalizadas (mismo artista)
      tasteRecs,         // 3. Según tus gustos (mismo género)
      globalTop,         // 4. Top 20 global (likes + plays)
      exploreSongs,      // 5. Explorar nuevos géneros
    });
  } catch (err) {
    console.error('getHomeSections error:', err);
    return res.status(500).json({ message: 'Error al cargar home' });
  }
};