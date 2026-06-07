import { Response } from "express";
import { Request } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma, { getPlan, crearSuscripcion } from "../lib/db";
import redis from "../lib/redis";
import { analizarComprobante } from "../lib/ocr";
import path from "path";

export const subirComprobante = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  const userId = req.userId as string;

  if (!req.file) {
    res.status(400).json({ error: "Debes subir una imagen del comprobante" });
    return;
  }

  const imagePath = req.file.path;

  try {
    // 1. OCR sobre el comprobante
    const { text, codigoEncontrado } = await analizarComprobante(imagePath);

    if (!codigoEncontrado) {
      res.status(422).json({
        error: "No se encontró el código de referencia en el comprobante",
        hint: "Asegúrate de que el código ECH-XXXXXXXX sea visible en la imagen",
        textoDetectado: text.slice(0, 300),
      });
      return;
    }

    // 2. Buscar el pago con ese código
    const pago = await prisma.pago.findUnique({
      where: { codigo_ref: codigoEncontrado },
    });

    if (!pago) {
      res.status(404).json({
        error: `Código ${codigoEncontrado} no encontrado`,
        hint: "Verifica que el código en el comprobante coincida exactamente",
      });
      return;
    }

    if (pago.usuario_id !== userId) {
      res.status(403).json({ error: "Este pago no te pertenece" });
      return;
    }

    if (pago.estado === "verificado") {
      res.status(400).json({ error: "Este pago ya fue verificado anteriormente" });
      return;
    }

    if (pago.estado === "cancelado") {
      res.status(400).json({ error: "Este código fue cancelado. Inicia un nuevo pago." });
      return;
    }

    if (new Date() > pago.expira_en) {
      await prisma.pago.update({
        where: { codigo_ref: codigoEncontrado },
        data: { estado: "cancelado" },
      });
      res.status(400).json({ error: "El código expiró. Inicia un nuevo pago." });
      return;
    }

    // 3. Verificar monto aproximado en el texto (opcional pero mejora seguridad)
    const montoEsperado = Number(pago.monto);
    const montoTexto = text.match(/(\d+[\.,]\d{2})/g);
    const montoEncontrado = montoTexto?.some(m => {
      const num = parseFloat(m.replace(",", "."));
      return Math.abs(num - montoEsperado) < 1; // tolerancia de 1 Bs
    });

    // 4. Activar suscripción automáticamente
    const plan = await getPlan(pago.plan_id);
    const ahora = new Date();
    const fechaFin = plan.duracion_meses > 0
      ? new Date(ahora.getFullYear(), ahora.getMonth() + plan.duracion_meses, ahora.getDate())
      : null;

    const sub = await crearSuscripcion(pago.usuario_id, pago.plan_id, ahora, fechaFin);

    await prisma.pago.update({
      where: { codigo_ref: codigoEncontrado },
      data: {
        estado: "verificado",
        suscripcion_id: sub.suscripcion_id,
        fecha_pago: ahora,
      },
    });

    // 5. Invalidar cache
    await redis.del(`sub:${userId}`).catch(() => null);

    res.json({
      success: true,
      message: "¡Suscripción activada automáticamente!",
      plan: plan.nombre_plan,
      fecha_fin: fechaFin,
      codigo_ref: codigoEncontrado,
      montoVerificado: montoEncontrado ?? false,
    });

  } catch (err) {
    console.error("[comprobante]", err);
    res.status(500).json({ error: "Error al procesar el comprobante" });
  }
};

// GET /payments/qr — devuelve info del QR estático
export const getQRInfo = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.json({
    imagen_url: "/qr/qr-echofy.png",
    banco: process.env.QR_BANCO,
    titular: process.env.QR_NOMBRE_TITULAR,
    cuenta: process.env.QR_NUMERO_CUENTA,
  });
};