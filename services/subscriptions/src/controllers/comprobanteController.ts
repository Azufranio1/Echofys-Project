import { Response, Request } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma, { getPlan, crearSuscripcion } from "../lib/db";
import redis from "../lib/redis";
import { analizarComprobante } from "../lib/ocr";

// Tolerancia de monto: máximo 0.5 Bs de diferencia
const TOLERANCIA_MONTO = 0.5;

export const subirComprobante = async (
  req: AuthRequest & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  const userId = req.userId as string;

  if (!req.file) {
    res.status(400).json({ error: "Debes subir una imagen del comprobante" });
    return;
  }

  try {
    const { text, codigoEncontrado, montoDetectado, titularDetectado, cuentaDetectada, hashComprobante } =
      await analizarComprobante(req.file.path);

    // ── 1. Código de referencia ──────────────────────────
    if (!codigoEncontrado) {
      res.status(422).json({
        error: "No se encontró el código de referencia ECH-XXXXXXXX en el comprobante",
        hint: "Asegúrate de que escribiste el código en la descripción de la transferencia",
      });
      return;
    }

    // ── 2. Comprobante ya usado (hash) ───────────────────
    const comprobanteUsado = await prisma.$queryRaw<any[]>`
      SELECT pago_id FROM pagos
      WHERE comprobante_hash = ${hashComprobante}
      AND estado = 'verificado'
      LIMIT 1
    `.catch(() => []);

    if (comprobanteUsado.length > 0) {
      res.status(400).json({
        error: "Este comprobante ya fue utilizado anteriormente",
        hint: "Cada comprobante solo puede usarse una vez",
      });
      return;
    }

    // ── 3. Buscar el pago en BD ──────────────────────────
    const pago = await prisma.pago.findUnique({ where: { codigo_ref: codigoEncontrado } });

    if (!pago) {
      res.status(404).json({
        error: `Código ${codigoEncontrado} no encontrado`,
        hint: "Verifica que el código sea el que generó el sistema al iniciar el pago",
      });
      return;
    }

    if (pago.usuario_id !== userId) {
      res.status(403).json({ error: "Este código de pago no corresponde a tu cuenta" });
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
      await prisma.pago.update({ where: { codigo_ref: codigoEncontrado }, data: { estado: "cancelado" } });
      res.status(400).json({ error: "El código expiró. Inicia un nuevo pago." });
      return;
    }

    // ── 4. Validar monto (OBLIGATORIO) ───────────────────
    const montoEsperado = Number(pago.monto);

    if (montoDetectado === null) {
      res.status(422).json({
        error: "No se pudo detectar el monto en el comprobante",
        hint: "Asegúrate de que el monto sea visible y legible en la imagen",
      });
      return;
    }

    if (Math.abs(montoDetectado - montoEsperado) > TOLERANCIA_MONTO) {
      res.status(422).json({
        error: `Monto incorrecto. Se esperaba Bs. ${montoEsperado} pero se detectó Bs. ${montoDetectado.toFixed(2)}`,
        hint: "El monto de la transferencia debe coincidir exactamente con el plan seleccionado",
      });
      return;
    }

    // ── 5. Validar titular o cuenta (al menos uno) ───────
    const tieneTitular = titularDetectado !== null;
    const tieneCuenta  = cuentaDetectada  !== null;

    if (!tieneTitular && !tieneCuenta) {
      res.status(422).json({
        error: "No se pudo verificar que el pago fue realizado a Echofy",
        hint: `Asegúrate de transferir a la cuenta de ${process.env.QR_NOMBRE_TITULAR} (${process.env.QR_BANCO})`,
        textoDetectado: text.slice(0, 400),
      });
      return;
    }

    // ── 6. Guardar hash para evitar reutilización ────────
    // Agregar columna comprobante_hash si no existe (lo hacemos con raw query segura)
    await prisma.$executeRaw`
      UPDATE pagos SET comprobante_hash = ${hashComprobante}
      WHERE codigo_ref = ${codigoEncontrado}
    `.catch(() => null);

    // ── 7. Activar suscripción ───────────────────────────
    const plan    = await getPlan(pago.plan_id);
    const ahora   = new Date();
    const fechaFin = plan.duracion_meses > 0
      ? new Date(ahora.getFullYear(), ahora.getMonth() + plan.duracion_meses, ahora.getDate())
      : null;

    const sub = await crearSuscripcion(pago.usuario_id, pago.plan_id, ahora, fechaFin);

    await prisma.pago.update({
      where: { codigo_ref: codigoEncontrado },
      data: { estado: "verificado", suscripcion_id: sub.suscripcion_id, fecha_pago: ahora },
    });

    await redis.del(`sub:${userId}`).catch(() => null);

    res.json({
      success: true,
      message: "¡Suscripción activada automáticamente!",
      plan: plan.nombre_plan,
      fecha_fin: fechaFin,
      codigo_ref: codigoEncontrado,
      validaciones: {
        codigo:   true,
        monto:    true,
        titular:  tieneTitular,
        cuenta:   tieneCuenta,
      },
    });

  } catch (err) {
    console.error("[comprobante]", err);
    res.status(500).json({ error: "Error al procesar el comprobante" });
  }
};

export const getQRInfo = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    imagen_url: "/qr/qr-echofy.png",
    banco:    process.env.QR_BANCO,
    titular:  process.env.QR_NOMBRE_TITULAR,
    cuenta:   process.env.QR_NUMERO_CUENTA,
  });
};