import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { Lyrics } from "../models/Lyrics";
import redis from "../lib/redis";
import { fetchLyricsFromAllProviders } from "../lib/lyricsProviders";

const CACHE_TTL = 60 * 60 * 24 * 7;

function buildPayload(doc: InstanceType<typeof Lyrics>) {
  return {
    songId:          doc.songId,
    trackName:       doc.trackName,
    artistName:      doc.artistName,
    albumName:       doc.albumName,
    durationSeconds: doc.durationSeconds,
    instrumental:    doc.instrumental,
    hasSyncedLyrics: !!doc.syncedLyrics,
    hasPlainLyrics:  !!doc.plainLyrics,
    plainLyrics:     doc.plainLyrics,
    syncedLyrics:    doc.syncedLyrics,
    dbSource:        doc.source,
  };
}

async function cacheSet(key: string, value: object): Promise<void> {
  try {
    await redis.setEx(key, CACHE_TTL, JSON.stringify(value));
  } catch { }
}

function parseLrc(lrc: string): Array<{ time: number; text: string }> {
  const lines: Array<{ time: number; text: string }> = [];
  const re = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;
  for (const line of lrc.split("\n")) {
    const m = line.match(re);
    if (!m) continue;
    const ms = +m[1] * 60_000 + +m[2] * 1_000 + +m[3].padEnd(3, "0");
    const text = m[4].trim();
    if (text) lines.push({ time: ms, text });
  }
  return lines;
}

export const getLyrics = async (req: AuthRequest, res: Response): Promise<void> => {
  const { songId } = req.params;
  const cacheKey = `lyrics:${songId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) { res.json({ ...JSON.parse(cached), servedFrom: "cache" }); return; }
  } catch { }

  const saved = await Lyrics.findOne({ songId });
  if (saved) {
    const payload = buildPayload(saved);
    await cacheSet(cacheKey, payload);
    res.json({ ...payload, servedFrom: "db" });
    return;
  }

  res.status(404).json({
    error: "Sin letras",
    hint: "Usa POST /lyrics/:songId/fetch para buscar automáticamente",
  });
};

]export const fetchAndSaveLyrics = async (req: AuthRequest, res: Response): Promise<void> => {
  const { songId } = req.params;
  const { trackName, artistName, albumName, duration } = req.body as {
    trackName: string; artistName: string; albumName?: string; duration?: number;
  };

  if (!trackName || !artistName) {
    res.status(400).json({ error: "trackName y artistName son requeridos" });
    return;
  }

  const existing = await Lyrics.findOne({ songId });
  if (existing) {
    res.json({ message: "Ya existen letras", dbSource: existing.source, hasSynced: !!existing.syncedLyrics, hasPlain: !!existing.plainLyrics });
    return;
  }

  const result = await fetchLyricsFromAllProviders({ trackName, artistName, albumName, duration });

  if (!result) {
    res.status(404).json({ error: "No encontrado en ninguna fuente", hint: "Sube letras manualmente con PUT /lyrics/:songId" });
    return;
  }

  try {
    const lyrics = await Lyrics.create({
      songId, trackName, artistName,
      albumName,
      durationSeconds: duration,
      plainLyrics:  result.plainLyrics  ?? undefined,
      syncedLyrics: result.syncedLyrics ?? undefined,
      source:       result.source === "manual" ? "manual" : "lrclib",
      instrumental: result.instrumental,
    });

    const payload = buildPayload(lyrics);
    await cacheSet(`lyrics:${songId}`, payload);
    res.status(201).json({ ...payload, servedFrom: result.source });

  } catch (err: any) {
    // Si hay duplicate key, la canción ya fue insertada por otra petición simultánea
    if (err.code === 11000) {
      const saved = await Lyrics.findOne({ songId });
      if (saved) {
        const payload = buildPayload(saved);
        await cacheSet(`lyrics:${songId}`, payload);
        res.json({ ...payload, servedFrom: "db" });
        return;
      }
    }
    throw err;
  }
};

export const upsertLyrics = async (req: AuthRequest, res: Response): Promise<void> => {
  const { songId } = req.params;
  const { trackName, artistName, albumName, durationSeconds, plainLyrics, syncedLyrics, instrumental } = req.body as {
    trackName: string; artistName: string; albumName?: string; durationSeconds?: number;
    plainLyrics?: string; syncedLyrics?: string; instrumental?: boolean;
  };

  if (!trackName || !artistName) {
    res.status(400).json({ error: "trackName y artistName son requeridos" });
    return;
  }

  if (!plainLyrics && !syncedLyrics && !instrumental) {
    res.status(400).json({ error: "Envía plainLyrics, syncedLyrics, o instrumental: true" });
    return;
  }

  const lyrics = await Lyrics.findOneAndUpdate(
    { songId },
    { songId, trackName, artistName, albumName, durationSeconds, plainLyrics, syncedLyrics, source: "manual", instrumental: instrumental ?? false },
    { upsert: true, new: true }
  );

  await redis.del(`lyrics:${songId}`).catch(() => null);
  const payload = buildPayload(lyrics);
  await cacheSet(`lyrics:${songId}`, payload);
  res.json({ ...payload, message: "Letras guardadas" });
};

export const deleteLyrics = async (req: AuthRequest, res: Response): Promise<void> => {
  const { songId } = req.params;
  const deleted = await Lyrics.findOneAndDelete({ songId });

  if (!deleted) { res.status(404).json({ error: "No hay letras para eliminar" }); return; }

  await redis.del(`lyrics:${songId}`).catch(() => null);
  res.json({ message: "Letras eliminadas" });
};

export const getSyncedLines = async (req: AuthRequest, res: Response): Promise<void> => {
  const { songId } = req.params;
  const lyrics = await Lyrics.findOne({ songId }).select("syncedLyrics instrumental");

  if (!lyrics) { res.status(404).json({ error: "Sin letras para esta canción" }); return; }
  if (lyrics.instrumental) { res.json({ instrumental: true, lines: [] }); return; }
  if (!lyrics.syncedLyrics) { res.status(404).json({ error: "Sin letras sincronizadas" }); return; }

  res.json({ instrumental: false, lines: parseLrc(lyrics.syncedLyrics) });
};