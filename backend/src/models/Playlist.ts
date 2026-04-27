import { Schema, model, Document, Types } from 'mongoose';

export interface IPlaylist extends Document {
  userId: string;           // UUID hex de MySQL
  name: string;
  isPublic: boolean;
  songs: Types.ObjectId[];  // array de IDs de canciones (Music)
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    userId:   { type: String, required: true, index: true },
    name:     { type: String, required: true, trim: true, maxlength: 100 },
    isPublic: { type: Boolean, default: false },
    songs:    [{ type: Schema.Types.ObjectId, ref: 'Music' }],
  },
  { timestamps: true }
);

export default model<IPlaylist>('Playlist', PlaylistSchema);