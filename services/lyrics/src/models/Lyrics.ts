import { Schema, model, Document } from "mongoose";

export interface ILyrics extends Document {
  songId: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  durationSeconds?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
  source: "lrclib" | "manual";
  instrumental: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LyricsSchema = new Schema<ILyrics>(
  {
    songId:          { type: String, required: true, unique: true, index: true },
    trackName:       { type: String, required: true },
    artistName:      { type: String, required: true },
    albumName:       { type: String },
    durationSeconds: { type: Number },
    plainLyrics:     { type: String },
    syncedLyrics:    { type: String },
    source:          { type: String, enum: ["lrclib", "manual"], required: true },
    instrumental:    { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Lyrics = model<ILyrics>("Lyrics", LyricsSchema);