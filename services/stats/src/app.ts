import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import statsRoutes from './routes/statsRoutes';
import { connectRedis } from './lib/redis';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Stats: MongoDB conectado'))
  .catch(err => console.error('❌ Stats: MongoDB error', err));

connectRedis()
  .then(() => console.log('✅ Stats: Redis conectado'))
  .catch(err => console.error('❌ Stats: Redis error', err));

app.use('/api/stats', statsRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Stats service listo en puerto ${PORT}`)
);