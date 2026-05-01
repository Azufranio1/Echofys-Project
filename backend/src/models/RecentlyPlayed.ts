import { Schema, model, Document, Types } from 'mongoose';

interface IPlay {
  songId: Types.ObjectId;
  playedAt: Date;
}

export interface IRecentlyPlayed extends Document {
  userId: string;       // UUID hex de MySQL
  plays: IPlay[];       // subdocumentos ordenados por playedAt desc
}

const PlaySchema = new Schema<IPlay>(
  {
    songId:   { type: Schema.Types.ObjectId, ref: 'Music', required: true },
    playedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RecentlyPlayedSchema = new Schema<IRecentlyPlayed>({
  userId: { type: String, required: true, unique: true, index: true },
  plays:  { type: [PlaySchema], default: [] },
});

export default model<IRecentlyPlayed>('RecentlyPlayed', RecentlyPlayedSchema);