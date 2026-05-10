import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import playlistRoutes from './routes/playlistRoutes';

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Playlists: MongoDB conectado'))
  .catch(err => console.error('❌ Playlists: MongoDB error', err));

app.use('/api/playlists', playlistRoutes);

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Playlists service listo en puerto ${PORT}`)
);