import { Schema, model } from 'mongoose';

const songSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: String,
  genre: String,
  year: Number,
  duration: String,      // Ej: "3:45"
  driveId: { type: String, required: true }, // El ID de Google Drive para el stream
  coverUrl: String,      // URL de la carátula
  status: { type: String, default: 'active' }
}, { timestamps: true }); // Esto añade fecha de creación y actualización automáticamente

export const Song = model('Song', songSchema);