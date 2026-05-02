import { Request, Response } from 'express';
import RecentlyPlayed from '../models/RecentlyPlayed';
import { Music } from '../models/Music';

/* ─────────────────────────────────────────
   GET /api/stats
   Devuelve todas las estadísticas del usuario
───────────────────────────────────────── */
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    // 1. Historial completo del usuario
    const history = await RecentlyPlayed.findOne({ userId });
    if (!history || history.plays.length === 0) {
      return res.json({ empty: true });
    }

    const plays = history.plays;
    const totalPlays = plays.length;

    // IDs de canciones reproducidas
    const songIds = plays.map((p: any) => p.songId.toString());

    // Obtener documentos de canciones únicas
    const uniqueIds   = [...new Set(songIds)];
    const songDocs    = await Music.find({ _id: { $in: uniqueIds } });
    const songMap     = new Map(songDocs.map((s: any) => [s._id.toString(), s]));

    // ── 2. Conteo por canción (Top 5) ──
    const songCount: Record<string, number> = {};
    songIds.forEach(id => { songCount[id] = (songCount[id] || 0) + 1; });

    const topSongs = Object.entries(songCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ song: songMap.get(id), count }))
      .filter(x => x.song);

    // ── 3. Conteo por artista (Top 5) ──
    const artistCount: Record<string, number> = {};
    songIds.forEach(id => {
      const song = songMap.get(id) as any;
      if (song?.artist) artistCount[song.artist] = (artistCount[song.artist] || 0) + 1;
    });

    const topArtists = Object.entries(artistCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([artist, count]) => {
        // Buscar artwork del artista (primera canción que tenga)
        const artwork = songDocs.find((s: any) => s.artist === artist && s.artwork) as any;
        return { artist, count, artwork: artwork?.artwork ?? null };
      });

    // ── 4. ADN Musical: géneros (última semana) ──
    const weekAgo      = Date.now() - 7 * 24 * 3600 * 1000;
    const recentPlays  = plays.filter((p: any) => new Date(p.playedAt).getTime() > weekAgo);
    const recentSongIds = recentPlays.map((p: any) => p.songId.toString());

    const genreCount: Record<string, number> = {};
    recentSongIds.forEach(id => {
      const song = songMap.get(id) as any;
      if (song?.genre) genreCount[song.genre] = (genreCount[song.genre] || 0) + 1;
    });

    const totalGenrePlays = Object.values(genreCount).reduce((a, b) => a + b, 0);
    const genreDistribution = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .map(([genre, count]) => ({
        genre,
        count,
        pct: totalGenrePlays > 0 ? Math.round((count / totalGenrePlays) * 100) : 0,
      }));

    // Personalidad musical según género dominante
    const dominantGenre = genreDistribution[0]?.genre?.toLowerCase() ?? '';
    const personality   = getPersonality(dominantGenre, genreDistribution[0]?.pct ?? 0);

    // ── 5. Mapa de calor: hora del día ──
    const hourCount: Record<number, number> = {};
    plays.forEach((p: any) => {
      const hour = new Date(p.playedAt).getHours();
      hourCount[hour] = (hourCount[hour] || 0) + 1;
    });

    const heatmapHours = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      count: hourCount[h] || 0,
    }));

    const peakHour     = heatmapHours.reduce((a, b) => (b.count > a.count ? b : a)).hour;
    const timePersona  = getTimePersona(peakHour);

    // ── 6. Mapa de calor: día de la semana ──
    const dayNames  = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayCount: Record<number, number> = {};
    plays.forEach((p: any) => {
      const day = new Date(p.playedAt).getDay();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });
    const heatmapDays = Array.from({ length: 7 }, (_, d) => ({
      day: dayNames[d],
      count: dayCount[d] || 0,
    }));

    // ── 7. Nivel explorador ──
    const allGenres        = await Music.distinct('genre', { status: { $regex: /^\s*complete\s*$/i } });
    const listenedGenres   = new Set(Object.keys(genreCount));
    const explorerPct      = allGenres.length > 0
      ? Math.round((listenedGenres.size / allGenres.length) * 100)
      : 0;
    const explorerLevel    = getExplorerLevel(explorerPct);

    // ── 8. Resumen numérico ──
    const uniqueSongs  = uniqueIds.length;
    const minutesTotal = uniqueSongs * 3.5; // estimado ~3.5 min/canción

    return res.json({
      empty:            false,
      totalPlays,
      uniqueSongs,
      minutesTotal:     Math.round(minutesTotal),
      topSongs,
      topArtists,
      genreDistribution,
      personality,
      heatmapHours,
      heatmapDays,
      peakHour,
      timePersona,
      explorerPct,
      explorerLevel,
      allGenresCount:   allGenres.length,
      listenedGenresCount: listenedGenres.size,
    });
  } catch (err) {
    console.error('getUserStats error:', err);
    return res.status(500).json({ message: 'Error al obtener estadísticas' });
  }
};

/* ── Helpers ── */
function getPersonality(genre: string, pct: number): { title: string; description: string; emoji: string } {
  if (pct < 30) return { title: 'Explorador Total', description: 'Tu gusto es tan amplio como el universo mismo.', emoji: '🌌' };

  const map: Record<string, { title: string; description: string; emoji: string }> = {
    rock:        { title: 'Rockstar en el Alma',   description: `Eres un ${pct}% pura adrenalina y distorsión.`, emoji: '🎸' },
    pop:         { title: 'Amante del Hit',         description: `Un ${pct}% de tus canciones son para cantar a todo volumen.`, emoji: '🎤' },
    jazz:        { title: 'Alma de Jazz',            description: `El ${pct}% de tu semana suena a improvisación y elegancia.`, emoji: '🎷' },
    classical:   { title: 'Espíritu Clásico',        description: `Con un ${pct}% de clásicos, tienes buen gusto atemporal.`, emoji: '🎻' },
    electronic:  { title: 'Hijo de la Máquina',      description: `${pct}% beats y sintetizadores. Vives en el futuro.`, emoji: '🎛️' },
    hiphop:      { title: 'Flow Constante',           description: `Un ${pct}% de rimas y ritmo. El flow no para.`, emoji: '🎧' },
    'hip-hop':   { title: 'Flow Constante',           description: `Un ${pct}% de rimas y ritmo. El flow no para.`, emoji: '🎧' },
    metal:       { title: 'Alma de Metal',            description: `${pct}% intensidad pura. Nada te detiene.`, emoji: '🤘' },
    alternative: { title: 'Espíritu Alternativo',     description: `Un ${pct}% fuera de lo convencional. Así se hace.`, emoji: '✨' },
    indie:       { title: 'Indie at Heart',           description: `${pct}% independiente y auténtico. Tu sello personal.`, emoji: '🌿' },
    reggaeton:   { title: 'Perreo Certificado',       description: `${pct}% ritmo urbano. No hay fiesta sin ti.`, emoji: '🔥' },
  };

  const key = Object.keys(map).find(k => genre.includes(k));
  return key ? map[key] : { title: 'Oído Universal', description: `Tu ${pct}% dominante define un gusto único.`, emoji: '🎵' };
}

function getTimePersona(hour: number): { title: string; description: string; emoji: string } {
  if (hour >= 5  && hour < 12) return { title: 'Madrugador Musical', description: 'Empiezas el día con energía y buen ritmo.', emoji: '🌅' };
  if (hour >= 12 && hour < 17) return { title: 'Groove de Tarde',    description: 'La tarde es tu momento de mayor concentración musical.', emoji: '☀️' };
  if (hour >= 17 && hour < 21) return { title: 'Vibes Vespertinas',  description: 'El atardecer y la música van de la mano para ti.', emoji: '🌇' };
  return { title: 'Ave Nocturna',   description: 'La noche es tuya. Cuando todos duermen, tú escuchas.', emoji: '🌙' };
}

function getExplorerLevel(pct: number): { level: string; description: string; color: string } {
  if (pct >= 80) return { level: 'Explorador Legendario', description: 'Has descubierto casi todo. Eres una enciclopedia musical.', color: '#f59e0b' };
  if (pct >= 60) return { level: 'Aventurero',            description: 'Más de la mitad de la biblioteca explorada. ¡Sigue así!', color: '#a78bfa' };
  if (pct >= 40) return { level: 'Curioso',               description: 'Vas explorando poco a poco. Hay mucho por descubrir.', color: '#60a5fa' };
  if (pct >= 20) return { level: 'Fiel a sus raíces',     description: 'Te gusta lo que te gusta. Nada malo en eso.', color: '#34d399' };
  return         { level: 'Recién llegado',               description: 'Apenas empiezas. La biblioteca entera te espera.', color: '#9ca3af' };
}