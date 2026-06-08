import { Router } from 'express';
import * as artistController from '../controllers/artistController';

const router = Router();

// GET /api/artists         → lista todos los artistas
router.get('/', artistController.getAllArtists);

// GET /api/artists/:slug   → perfil completo (top songs + albums)
router.get('/:slug', artistController.getArtistProfile);

export default router;
