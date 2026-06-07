import Tesseract from "tesseract.js";
import crypto from "crypto";
import fs from "fs";

export interface OCRResult {
  text:             string;
  codigoEncontrado: string | null;
  montoDetectado:   number | null;
  titularDetectado: string | null;
  cuentaDetectada:  string | null;
  hashComprobante:  string;
}

export const analizarComprobante = async (imagePath: string): Promise<OCRResult> => {
  // Hash del archivo para detectar comprobantes reutilizados
  const fileBuffer     = fs.readFileSync(imagePath);
  const hashComprobante = crypto.createHash("sha256").update(fileBuffer).digest("hex");

  try {
    const { data } = await Tesseract.recognize(imagePath, "spa+eng", { logger: () => {} });
    const text = data.text;

    // Código de referencia ECH-XXXXXXXX
    const matchCodigo = text.match(/ECH[-\s]?([A-Z0-9]{8})/i);
    const codigoEncontrado = matchCodigo
      ? `ECH-${matchCodigo[1].toUpperCase().replace(/\s/g, "")}`
      : null;

    // Monto — buscar todos los números con decimales y tomar el mayor
    const matchMontos = text.match(/\b(\d{1,6}[.,]\d{2})\b/g);
    const montoDetectado = matchMontos
      ? Math.max(...matchMontos.map(m => parseFloat(m.replace(",", "."))))
      : null;

    // Titular — buscar nombre en el texto (normalizado a mayúsculas)
    const textUpper = text.toUpperCase().replace(/\s+/g, " ");
    const titularEnv = (process.env.QR_NOMBRE_TITULAR || "").toUpperCase();
    const titularAlt = (process.env.QR_TITULAR_ALTERNATIVO || "").toUpperCase();
    const titularDetectado =
      (titularEnv && textUpper.includes(titularEnv)) ? titularEnv :
      (titularAlt && textUpper.includes(titularAlt)) ? titularAlt :
      null;

    // Número de cuenta — buscar en texto
    const cuentaEnv      = (process.env.QR_NUMERO_CUENTA || "").replace(/\s/g, "");
    const textSinEspacios = text.replace(/\s/g, "");
    const cuentaDetectada = cuentaEnv && textSinEspacios.includes(cuentaEnv) ? cuentaEnv : null;

    return { text, codigoEncontrado, montoDetectado, titularDetectado, cuentaDetectada, hashComprobante };
  } catch (err) {
    console.error("[OCR] Error:", err);
    return { text: "", codigoEncontrado: null, montoDetectado: null, titularDetectado: null, cuentaDetectada: null, hashComprobante };
  } finally {
    try { fs.unlinkSync(imagePath); } catch { }
  }
};