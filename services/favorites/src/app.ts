import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import favoriteRoutes from './routes/favoriteRoutes';
import { connectRedis } from './lib/redis';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Favorites: MongoDB conectado'))
  .catch(err => console.error('❌ Favorites: MongoDB error', err));

connectRedis()
  .then(() => console.log('✅ Favorites: Redis conectado'))
  .catch(err => console.error('❌ Favorites: Redis error', err));

app.use('/api/favorites', favoriteRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Favorites service listo en puerto ${PORT}`)
);