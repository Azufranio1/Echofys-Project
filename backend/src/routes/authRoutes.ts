// backend/src/routes/authRoutes.ts

import { Router } from 'express';
// Usa la ruta relativa exacta
import * as authController from '../controllers/authController';

const router = Router();

// Cambiamos la forma de llamarlos para evitar el 'undefined'
router.post('/register', (req, res) => authController.register(req, res));
router.post('/login', (req, res) => authController.login(req, res));

export default router;