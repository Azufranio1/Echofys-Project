import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/authRoutes';

const app    = express();
const prisma = new PrismaClient();
const PORT   = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

prisma.$connect()
  .then(() => console.log('✅ Auth: MySQL conectado'))
  .catch(err => console.error('❌ Auth: MySQL error', err));

app.use('/api/auth', authRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Auth service listo en puerto ${PORT}`)
);