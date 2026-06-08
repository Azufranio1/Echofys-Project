import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import artistRoutes from './routes/artistRoutes';
import { connectRedis } from './lib/redis';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Artists: MongoDB conectado'))
  .catch(err => console.error('❌ Artists: MongoDB error', err));

connectRedis()
  .then(() => console.log('✅ Artists: Redis conectado'))
  .catch(err => console.error('❌ Artists: Redis error', err));

app.use('/api/artists', artistRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🎤 Artists service listo en puerto ${PORT}`)
);
