import { Router } from 'express';
import * as songController from '../controllers/songController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Público: Cualquiera puede ver el catálogo y escuchar
router.get('/', songController.getAllSongs);
router.get('/stream/:driveId', songController.streamSong);

// Protegido: Solo usuarios con Token pueden agregar canciones
router.post('/', authenticateToken, songController.createSong);

export default router;