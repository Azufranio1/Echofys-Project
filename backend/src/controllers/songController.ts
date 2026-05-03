import { Request, Response } from 'express';
import { Music } from '../models/Music';
import { redisClient } from '../lib/redis'; 
import { drive } from '../services/driveService';
import { cacheGet, cacheSet, CACHE_KEYS, TTL } from '../lib/cache';

// 1. Obtener catálogo (con Caché)
export const getAllSongs = async (req: Request, res: Response) => {
  const cacheKey = CACHE_KEYS.allSongs();
  try {
    const cached = await cacheGet<any[]>(cacheKey);
    if (cached) return res.json(cached);
 
    const songs = await Music.find({ status: { $regex: /^\s*complete\s*$/i } });
    await cacheSet(cacheKey, songs, TTL.allSongs);
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener canciones' });
  }
};

// 2. Guardar canción (Protegido)
export const createSong = async (req: Request, res: Response) => {
  try {
    const newSong = new Music(req.body);
    await newSong.save();
    await redisClient.del('Music:all'); // Invalidar caché
    res.status(201).json({ message: 'Canción guardada', song: newSong });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar en Mongo' });
  }
};

// 3. Streaming desde Drive
export const streamSong = async (req: Request, res: Response) => {
  const { driveId } = req.params;
  const isDownload = req.query.download === 'true'; // Detectamos si es descarga

  try {
    const metadata = await drive.files.get({ fileId: driveId, fields: 'size, name' });
    const fileSize = parseInt(metadata.data.size || '0');
    const fileName = metadata.data.name || 'track.mp3';

    // SI ES DESCARGA: Forzamos al navegador a bajar el archivo
    if (isDownload) {
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      const stream = await drive.files.get({ fileId: driveId, alt: 'media' }, { responseType: 'stream' });
      return stream.data.pipe(res);
    }
    
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const stream = await drive.files.get(
        { fileId: driveId, alt: 'media' },
        { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } }
      );

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': 'audio/mpeg',
      });
      stream.data.pipe(res);
    } else {
      const stream = await drive.files.get({ fileId: driveId, alt: 'media' }, { responseType: 'stream' });
      res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg' });
      stream.data.pipe(res);
    }
  } catch (error: any) {
    res.status(500).json({ error: 'Error en el streaming de Drive' });
  }
};