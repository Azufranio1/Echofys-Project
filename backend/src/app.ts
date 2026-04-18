import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import musicRoutes from './routes/musicRoutes';
import authRoutes from './routes/authRoutes';
import { connectRedis } from './lib/redis';

import { Song } from './models/Song';

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// 1. Conexión a Mongo
const mongoUri = process.env.MONGO_URI || 'mongodb://mongo:27017/echofy';
mongoose.connect(mongoUri)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error de conexión:', err));

connectRedis().then(() => console.log('✅ Conectado a Redis'));
// 2. REGISTRO DE RUTAS
// Todas las rutas que definas en musicRoutes.ts se le sumará el prefijo /api/songs
app.use('/api/songs', musicRoutes);
app.use('/api/auth', authRoutes);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});