import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import musicRoutes from './routes/musicRoutes';
import authRoutes from './routes/authRoutes';
import { connectRedis } from './lib/redis';


const app = express();
const PORT = process.env.PORT || 8080; 

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI || 'mongodb+srv://Echofy-Admin:Mr_Master123@cluster0.iz362.mongodb.net/echofy_db';

mongoose.connect(mongoUri)
  .then(() => console.log('✅ Conectado a MongoDB (Remoto)'))
  .catch(err => console.error('❌ Error de conexión:', err));

connectRedis().then(() => console.log('✅ Conectado a Redis'));
app.use('/api/songs', musicRoutes);
app.use('/api/auth', authRoutes);


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});