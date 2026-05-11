import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import queueRoutes from './routes/queueRoutes';
import { connectRedis } from './lib/redis';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Player: MongoDB conectado'))
  .catch(err => console.error('❌ Player: MongoDB error', err));

connectRedis()
  .then(() => console.log('✅ Player: Redis conectado'))
  .catch(err => console.error('❌ Player: Redis error', err));

app.use('/api/queue', queueRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Player service listo en puerto ${PORT}`)
);