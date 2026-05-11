import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite extends Document {
  userId: string;        // ← String, no ObjectId (usuario viene de MySQL)
  songId: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>({
  userId: { type: String, required: true },           // ← String
  songId: { type: Schema.Types.ObjectId, ref: 'Music', required: true },
  createdAt: { type: Date, default: Date.now }
});

FavoriteSchema.index({ userId: 1, songId: 1 }, { unique: true });

export default model<IFavorite>('Favorite', FavoriteSchema);