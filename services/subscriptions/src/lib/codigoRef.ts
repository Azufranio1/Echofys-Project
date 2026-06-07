import { customAlphabet } from "nanoid";

// Genera código tipo ECH-ABC123XY
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

export const generarCodigoRef = (): string => {
  return `ECH-${nanoid()}`;
};