import { Router } from 'express';
import { getUserStats } from '../controllers/statsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
router.use(authenticateToken);
router.get('/', getUserStats);

export default router;