import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import songsRoutes from './routes/musicRoutes';
import { connectRedis } from './lib/redis';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Songs: MongoDB conectado'))
  .catch(err => console.error('❌ Songs: MongoDB error', err));

connectRedis()
  .then(() => console.log('✅ Songs: Redis conectado'))
  .catch(err => console.error('❌ Songs: Redis error', err));

app.use('/api/songs', songsRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Playlists service listo en puerto ${PORT}`)
);