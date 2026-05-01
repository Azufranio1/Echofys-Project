import { Router } from 'express';
import { registerPlay, getNextQueue, getRecentlyPlayed, getHomeSections } from '../controllers/queueController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);

router.post('/played',  registerPlay);
router.get('/next',     getNextQueue);
router.get('/recent',   getRecentlyPlayed);
router.get('/home',     getHomeSections);   // ← nuevo

export default router;