import { Request, Response } from "express";
import { getPlanes } from "../lib/db";

export async function getPlanesHandler(req: Request, res: Response): Promise<void> {
  try {
    const planes = await getPlanes();
    const planesConDescuento = (planes as any[]).map((p: any) => {
      const precio = Number(p.precio);
      const esAnual = p.duracion_meses === 12;
      return {
        plan_id: p.plan_id,
        nombre_plan: p.nombre_plan,
        precio,
        duracion_meses: p.duracion_meses,
        precio_original: esAnual ? 240 : null,
        descuento_porcentaje: esAnual ? 30 : null,
        etiqueta: esAnual ? "Ahorra 30%" : null,
        es_gratis: precio === 0,
      };
    });
    res.json(planesConDescuento);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener planes" });
  }
}