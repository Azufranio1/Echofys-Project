import { Router } from 'express';
import { Song } from '../models/Song';
import { getFileStream } from '../services/driveService'; // <-- No olvides este import

const router = Router();

// Obtener todas las canciones (Ruta: GET /api/songs)
router.get('/', async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener canciones' });
  }
});

// Agregar una canción (Ruta: POST /api/songs)
router.post('/', async (req, res) => {
  const newSong = new Song(req.body);
  await newSong.save();
  res.json({ message: 'Canción guardada!', song: newSong });
});

// NUEVA RUTA: Streaming (Ruta: GET /api/songs/stream/:driveId)
router.get('/stream/:driveId', async (req, res) => {
  console.log("🎬 Iniciando stream para ID:", req.params.driveId);
  try {
    const stream = await getFileStream(req.params.driveId);
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes'); // Ayuda al reproductor a poder adelantar/atrasar
    
    stream.pipe(res);
  } catch (error) {
    console.error("❌ Error en stream:", error);
    res.status(500).send("No se pudo procesar el audio.");
  }
});

export default router;