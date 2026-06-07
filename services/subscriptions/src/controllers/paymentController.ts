import { Response } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { AuthRequest } from "../middleware/authMiddleware";
import prisma, { getPlan, getSuscripcionActiva, crearSuscripcion } from "../lib/db";
import redis from "../lib/redis";
import { generarCodigoRef } from "../lib/codigoRef";

export const iniciarPago = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const { plan_id } = req.body as { plan_id: number };

  if (!plan_id) { res.status(400).json({ error: "plan_id es requerido" }); return; }

  try {
    const plan = await getPlan(plan_id);
    if (!plan) { res.status(404).json({ error: "Plan no encontrado" }); return; }
    if (Number(plan.precio) === 0) { res.status(400).json({ error: "El plan gratuito no requiere pago" }); return; }

    const subActiva = await getSuscripcionActiva(userId);
    if (subActiva && subActiva.plan_id === plan_id) {
      res.status(400).json({ error: "Ya tienes una suscripción activa para este plan" });
      return;
    }

    await prisma.pago.updateMany({
      where: {
        usuario_id: userId,
        estado: { in: ["pendiente", "en_revision"] }
      },
      data: { estado: "cancelado" }
    });

    const codigoRef = generarCodigoRef();
    const expiraEn = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const pago = await prisma.pago.create({
      data: {
        usuario_id: userId,
        plan_id,
        codigo_ref: codigoRef,
        monto: new Decimal(plan.precio),
        estado: "pendiente",
        expira_en: expiraEn,
      },
    });

    await redis.setEx(
      `pago:ref:${codigoRef}`, 48 * 60 * 60,
      JSON.stringify({ pago_id: pago.pago_id, usuario_id: userId, plan_id, monto: Number(plan.precio) })
    ).catch(() => null);

    res.status(201).json({
      pago_id: pago.pago_id,
      codigo_ref: codigoRef,
      monto: Number(plan.precio),
      plan: plan.nombre_plan,
      expira_en: expiraEn,
      instrucciones: {
        paso1: "Abre tu app bancaria y escanea el QR de Echofy",
        paso2: `En la descripción/referencia escribe exactamente: ${codigoRef}`,
        paso3: `Realiza la transferencia por Bs. ${Number(plan.precio)}`,
        paso4: "Vuelve aquí y confirma tu pago",
      },
      qr_info: {
        numero_cuenta: process.env.QR_NUMERO_CUENTA,
        nombre: process.env.QR_NOMBRE_TITULAR,
        banco: process.env.QR_BANCO,
        monto: Number(plan.precio),
        referencia: codigoRef,
      },
    });
  } catch (error) {
    console.error("[payments/iniciar] Error:", error);
    res.status(500).json({ error: "Error al iniciar pago", details: error instanceof Error ? error.message : String(error) });
  }
};

export const confirmarPago = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const { codigo_ref } = req.body as { codigo_ref: string };

  if (!codigo_ref) { res.status(400).json({ error: "codigo_ref es requerido" }); return; }

  try {
    const pago = await prisma.pago.findUnique({ where: { codigo_ref } });
    if (!pago) { res.status(404).json({ error: "Código no encontrado" }); return; }
    if (pago.usuario_id !== userId) { res.status(403).json({ error: "Este pago no te pertenece" }); return; }
    if (pago.estado === "verificado") { res.status(400).json({ error: "Ya fue verificado" }); return; }
    if (pago.estado === "cancelado") { res.status(400).json({ error: "Este pago fue cancelado" }); return; }
    if (new Date() > pago.expira_en) {
      await prisma.pago.update({ where: { codigo_ref }, data: { estado: "cancelado" } });
      res.status(400).json({ error: "El código expiró. Inicia un nuevo pago." });
      return;
    }

    await prisma.pago.update({
      where: { codigo_ref },
      data: { estado: "en_revision", fecha_pago: new Date() },
    });

    res.json({
      message: "Pago confirmado, en revisión. Tu suscripción se activará en minutos.",
      codigo_ref,
      estado: "en_revision",
    });
  } catch (error) {
    console.error("[payments/confirmar] Error:", error);
    res.status(500).json({ error: "Error al confirmar pago", details: error instanceof Error ? error.message : String(error) });
  }
};

export const verificarPago = async (req: AuthRequest, res: Response): Promise<void> => {
  const pagoId = parseInt(req.params.pago_id);

  try {
    const pago = await prisma.pago.findUnique({ where: { pago_id: pagoId } });
    if (!pago) { res.status(404).json({ error: "Pago no encontrado" }); return; }
    if (pago.estado === "verificado") { res.status(400).json({ error: "Ya fue verificado" }); return; }

    const plan = await getPlan(pago.plan_id);
    const ahora = new Date();
    const fechaFin = plan.duracion_meses > 0
      ? new Date(ahora.getFullYear(), ahora.getMonth() + plan.duracion_meses, ahora.getDate())
      : null;

    const sub = await crearSuscripcion(pago.usuario_id, pago.plan_id, ahora, fechaFin);

    await prisma.pago.update({
      where: { pago_id: pagoId },
      data: { estado: "verificado", suscripcion_id: sub.suscripcion_id, fecha_pago: ahora },
    });

    await redis.del(`sub:${pago.usuario_id}`).catch(() => null);

    res.json({
      message: "Suscripción activada",
      usuario_id: pago.usuario_id,
      plan: plan.nombre_plan,
      fecha_fin: fechaFin,
    });
  } catch (error) {
    console.error("[payments/verificar] Error:", error);
    res.status(500).json({ error: "Error al verificar pago", details: error instanceof Error ? error.message : String(error) });
  }
};

export const getPagosPendientes = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const pagos = await prisma.$queryRaw<any[]>`
      SELECT p.*, pl.nombre_plan, pl.precio as plan_precio
      FROM pagos p
      JOIN planes pl ON p.plan_id = pl.plan_id
      WHERE p.estado = 'en_revision'
      ORDER BY p.fecha_pago ASC
    `;
    res.json(pagos);
  } catch (error) {
    console.error("[payments/pendientes] Error:", error);
    res.status(500).json({ error: "Error al obtener pagos pendientes", details: error instanceof Error ? error.message : String(error) });
  }
};

export const getHistorialPagos = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  try {
    const pagos = await prisma.$queryRaw<any[]>`
      SELECT p.pago_id, p.codigo_ref, p.monto, p.estado, p.fecha_creacion, p.fecha_pago,
             pl.nombre_plan
      FROM pagos p
      JOIN planes pl ON p.plan_id = pl.plan_id
      WHERE p.usuario_id = ${userId}
      ORDER BY p.fecha_creacion DESC
    `;
    res.json(pagos);
  } catch (error) {
    console.error("[payments/historial] Error:", error);
    res.status(500).json({ error: "Error al obtener historial", details: error instanceof Error ? error.message : String(error) });
  }
};