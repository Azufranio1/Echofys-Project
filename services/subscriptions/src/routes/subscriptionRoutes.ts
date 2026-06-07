import { Router } from "express";
import { authMiddleware, adminOnly } from "../middleware/authMiddleware";
import { getPlanesHandler } from "../controllers/planController";
import { getMiSuscripcion, checkPremium } from "../controllers/subscriptionController";
import { iniciarPago, confirmarPago, verificarPago, getPagosPendientes, getHistorialPagos } from "../controllers/paymentController";
import { subirComprobante, getQRInfo } from "../controllers/comprobanteController";
import { upload } from "../lib/upload";

const router = Router();

router.get("/planes",      getPlanesHandler);
router.get("/payments/qr", getQRInfo);

router.use(authMiddleware as any);
router.get("/subscriptions/me",    getMiSuscripcion as any);
router.get("/subscriptions/check", checkPremium as any);
router.post("/payments/iniciar",   iniciarPago as any);
router.post("/payments/confirmar", confirmarPago as any);
router.get("/payments/historial",  getHistorialPagos as any);

// Subir comprobante — activa suscripción automáticamente
router.post(
  "/payments/comprobante",
  upload.single("comprobante") as any,
  subirComprobante as any
);

router.get("/payments/pendientes",          adminOnly as any, getPagosPendientes as any);
router.post("/payments/verificar/:pago_id", adminOnly as any, verificarPago as any);

export default router;