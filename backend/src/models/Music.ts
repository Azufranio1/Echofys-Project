import { Schema, model } from 'mongoose';

const musicSchema = new Schema({
  title: { type: String, required: true },
  artist: { type: String, required: true },
  album: String,
  genre: String,
  year: String,          // En tu imagen es String ("2009")
  artwork: String,       // CAMBIO: En Atlas se llama 'artwork', no 'coverUrl'
  driveId: { type: String, required: true },
  status: { type: String, required: true }, // "complete"
  youtubeId: String,
  titleNorm: String,
  artistNorm: String,
  fileHash: String,
  source: String
}, { 
  timestamps: true, 
  collection: 'Music' 
});

export const Music = model('Music', musicSchema);