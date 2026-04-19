import { Router } from 'express';
import { Song } from '../models/Song';
import { redisClient } from '../lib/redis';
// Importamos ambos desde el service que SI existe
import { getFileStream, drive } from '../services/driveService'; 

const router = Router();

// Obtener todas las canciones (Ruta: GET /api/songs)
router.get('/', async (req, res) => {
  const CACHE_KEY = 'songs:all';

  try {
    // 1. Intentar obtener los datos de Redis
    const cachedSongs = await redisClient.get(CACHE_KEY);

    if (cachedSongs) {
      console.log('⚡ [Redis] Catálogo servido desde el caché');
      return res.json(JSON.parse(cachedSongs));
    }

    // 2. Si no está en Redis, consultar MongoDB
    console.log('🍃 [Mongo] Catálogo consultado en la base de datos');
    const songs = await Song.find();

    // 3. Guardar en Redis para la próxima vez
    // Expira en 3600 segundos (1 hora) para que no sea data vieja para siempre
    await redisClient.setEx(CACHE_KEY, 3600, JSON.stringify(songs));

    res.json(songs);
  } catch (error) {
    console.error('❌ Error en el catálogo:', error);
    res.status(500).json({ message: 'Error al obtener canciones' });
  }
});

// Agregar una canción (Ruta: POST /api/songs)
router.post('/', async (req, res) => {
  try {
    const newSong = new Song(req.body);
    await newSong.save();

    // 🔥 IMPORTANTE: Limpiar el caché de Redis para que la próxima 
    // consulta GET obligue a recargar desde Mongo
    await redisClient.del('songs:all');
    console.log('♻️ [Redis] Caché invalidado por nueva inserción');

    res.json({ message: 'Canción guardada!', song: newSong });
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar canción' });
  }
});

// NUEVA RUTA: Streaming (Ruta: GET /api/songs/stream/:driveId)
// En tu backend (ejemplo conceptual de cómo debería quedar la lógica)
router.get('/stream/:driveId', async (req, res) => {
  try {
    const driveId = req.params.driveId;
    
    // LOG 1: Verificar si entra la petición
    console.log(`Buscando archivo: ${driveId}`);

    // Si 'drive' viene de otro archivo, asegúrate de importarlo
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'size',
    });

    const fileSize = parseInt(fileMetadata.data.size || "0");
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      console.log(`Streaming rango: ${start} - ${end} de ${fileSize}`);

      const streamResponse = await drive.files.get(
        { fileId: driveId, alt: 'media' },
        { 
          responseType: 'stream',
          headers: { Range: `bytes=${start}-${end}` } 
        }
      );

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': (end - start) + 1,
        'Content-Type': 'audio/mpeg',
      });

      streamResponse.data.pipe(res);
    } else {
      console.log(`Streaming completo: ${fileSize} bytes`);
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
        'Accept-Ranges': 'bytes',
      });
      
      const streamResponse = await drive.files.get(
        { fileId: driveId, alt: 'media' },
        { responseType: 'stream' }
      );
      streamResponse.data.pipe(res);
    }
  } catch (error: any) {
    // LOG CRÍTICO: Aquí verás por qué da el error 500
    console.error("❌ ERROR EN EL BACKEND:", error.message);
    res.status(500).send("Error interno del servidor");
  }
});

export default router;