import { Router } from 'express';
import { getMyPlaylists, getPlaylistById, createPlaylist, updatePlaylist, deletePlaylist, addSong, removeSong,} from '../controllers/playlistController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

router.get('/',              getMyPlaylists);
router.get('/:id',           getPlaylistById);
router.post('/',             createPlaylist);
router.patch('/:id',         updatePlaylist);
router.delete('/:id',        deletePlaylist);
router.post('/:id/songs',    addSong);
router.delete('/:id/songs/:songId', removeSong);

export default router;