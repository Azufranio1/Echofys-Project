import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import { PrismaClient } from '@prisma/client';

import musicRoutes from './routes/musicRoutes';
import authRoutes from './routes/authRoutes';
import { connectRedis } from './lib/redis';
import favoritesRouter from './routes/favoriteRoutes';


const app = express();

app.use(cors());
app.use(express.json());

const prisma = new PrismaClient();

// Añade esto debajo de las otras conexiones
prisma.$connect()
  .then(() => console.log('✅ Conectado a MySQL (Alwaysdata)'))
  .catch(err => console.error('❌ Error en MySQL:', err));

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://Echofy-Admin:Mr_Master123@cluster0.iz362.mongodb.net/Echofy-Music-Data';
const PORT = process.env.PORT || 8080;

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error Mongo:', err));

connectRedis().then(() => console.log('✅ Conectado a Redis Local'));
app.use('/api/songs', musicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRouter);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});