import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { getSuscripcionActiva } from "../lib/db";
import redis from "../lib/redis";

const CACHE_TTL = 60 * 5;

export const getMiSuscripcion = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  const cacheKey = `sub:${userId}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) { res.json({ ...JSON.parse(cached), fromCache: true }); return; }
  } catch { }

  try {
    const sub = await getSuscripcionActiva(userId);
    const payload = sub
      ? {
          activa: true,
          plan_id: sub.plan_id,
          plan: sub.nombre_plan,
          precio: Number(sub.precio),
          duracion_meses: sub.duracion_meses,
          fecha_inicio: sub.fecha_inicio,
          fecha_fin: sub.fecha_fin,
          es_premium: Number(sub.precio) > 0,
        }
      : { activa: false, plan: "Gratis", es_premium: false };

    try { await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(payload)); } catch { }
    res.json(payload);
  } catch {
    res.status(500).json({ error: "Error al obtener suscripción" });
  }
};

export const checkPremium = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.userId as string;
  try {
    const sub = await getSuscripcionActiva(userId);
    res.json({ premium: sub ? Number(sub.precio) > 0 : false });
  } catch {
    res.status(500).json({ error: "Error al verificar suscripción" });
  }
};