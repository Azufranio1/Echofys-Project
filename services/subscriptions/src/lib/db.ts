import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("[subscriptions] MySQL conectado");
  } catch (error) {
    console.error("[subscriptions] MySQL error:", error);
    process.exit(1);
  }
};

// Convierte hex string → Buffer para binary(16)
const hexToBuffer = (hex: string): Buffer => {
  const clean = hex.replace(/-/g, "").replace(/^0x/i, "");
  return Buffer.from(clean, "hex");
};

// Convierte binary(16) resultado → hex string
const bufferToHex = (buf: any): string => {
  if (Buffer.isBuffer(buf)) return buf.toString("hex");
  if (typeof buf === "string") return buf;
  return Buffer.from(buf).toString("hex");
};

export const getPlan = async (plan_id: number) => {
  const result = await prisma.$queryRaw<any[]>`
    SELECT * FROM planes WHERE plan_id = ${plan_id} AND activo = 1 LIMIT 1
  `;
  return result[0] ?? null;
};

export const getPlanes = async () => {
  return prisma.$queryRaw<any[]>`
    SELECT * FROM planes WHERE activo = 1 ORDER BY precio ASC
  `;
};

export const getSuscripcionActiva = async (usuario_id: string) => {
  const buf = hexToBuffer(usuario_id);
  const result = await prisma.$queryRaw<any[]>`
    SELECT s.*, p.nombre_plan, p.precio, p.duracion_meses
    FROM suscripciones_activas s
    JOIN planes p ON s.plan_id = p.plan_id
    WHERE s.usuario_id = ${buf}
      AND s.estado = 'activa'
      AND (s.fecha_fin IS NULL OR s.fecha_fin >= CURDATE())
    ORDER BY s.suscripcion_id DESC
    LIMIT 1
  `;
  return result[0] ?? null;
};

export const crearSuscripcion = async (
  usuario_id: string,
  plan_id: number,
  fecha_inicio: Date,
  fecha_fin: Date | null
) => {
  const buf = hexToBuffer(usuario_id);

  // Desactivar anteriores
  await prisma.$executeRaw`
    UPDATE suscripciones_activas
    SET estado = 'expirada'
    WHERE usuario_id = ${buf} AND estado = 'activa'
  `;

  // Insertar nueva — fecha_fin requerida por tu schema (NOT NULL en suscripciones_activas)
  const fechaFinFinal = fecha_fin ?? new Date("2099-12-31");

  await prisma.$executeRaw`
    INSERT INTO suscripciones_activas (usuario_id, plan_id, fecha_inicio, fecha_fin, estado)
    VALUES (${buf}, ${plan_id}, ${fecha_inicio}, ${fechaFinFinal}, 'activa')
  `;

  const result = await prisma.$queryRaw<any[]>`
    SELECT * FROM suscripciones_activas
    WHERE usuario_id = ${buf}
    ORDER BY suscripcion_id DESC LIMIT 1
  `;

  const row = result[0];
  return {
    ...row,
    suscripcion_id: row?.suscripcion_id,
    usuario_id: bufferToHex(row?.usuario_id),
  };
};

export default prisma;