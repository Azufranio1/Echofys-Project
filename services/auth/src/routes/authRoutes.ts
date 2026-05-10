import { Router } from 'express';
import { register, login } from '../controllers/authController';

const router = Router();

// Express pasa automáticamente req y res
router.post('/register', register);
router.post('/login', login);

export default router;