import { Router } from 'express';
import { toggleFavorite, getFavorites } from '../controllers/favoriteController';
import { authenticateToken } from '../middleware/authMiddleware'; // ajusta el nombre a tu middleware

const router = Router();

router.get('/', authenticateToken, getFavorites);
router.post('/toggle', authenticateToken, toggleFavorite);

export default router;