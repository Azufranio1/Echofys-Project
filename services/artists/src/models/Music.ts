import { Schema, model } from 'mongoose';

const musicSchema = new Schema({
  title:      { type: String, required: true },
  artist:     { type: String, required: true },
  album:      String,
  genre:      String,
  year:       String,
  artwork:    String,
  driveId:    { type: String, required: true },
  status:     { type: String, required: true },
  youtubeId:  String,
  titleNorm:  String,
  artistNorm: String,
  fileHash:   String,
  source:     String,
  likeCount:  { type: Number, default: 0, index: true },
  playCount:  { type: Number, default: 0, index: true },
}, {
  timestamps: true,
  collection: 'Music'
});

export const Music = model('Music', musicSchema);
