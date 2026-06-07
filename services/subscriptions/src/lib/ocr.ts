import Tesseract from "tesseract.js";
import path from "path";
import fs from "fs";

interface OCRResult {
  text: string;
  codigoEncontrado: string | null;
}

/**
 * Extrae texto de un comprobante de pago y busca el código ECH-XXXXXXXX
 */
export const analizarComprobante = async (
  imagePath: string
): Promise<OCRResult> => {
  try {
    const { data } = await Tesseract.recognize(imagePath, "spa+eng", {
      logger: () => {},
    });

    const text = data.text;

    // Buscar código de referencia ECH-XXXXXXXX
    const match = text.match(/ECH[-\s]?([A-Z0-9]{8})/i);
    const codigoEncontrado = match
      ? `ECH-${match[1].toUpperCase().replace(/\s/g, "")}`
      : null;

    return { text, codigoEncontrado };
  } catch (err) {
    console.error("[OCR] Error:", err);
    return { text: "", codigoEncontrado: null };
  } finally {
    // Limpiar imagen temporal
    try { fs.unlinkSync(imagePath); } catch { }
  }
};