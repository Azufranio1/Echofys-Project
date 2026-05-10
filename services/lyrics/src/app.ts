import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
// import lyricsRoutes from './routes/lyricsRoutes'; // ← tu compañero implementa esto

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI!)
  .then(() => console.log('✅ Lyrics: MongoDB conectado'))
  .catch(err => console.error('❌ Lyrics: MongoDB error', err));

// app.use('/api/lyrics', lyricsRoutes); // ← descomentar cuando esté listo

// Health check para que el contenedor no falle vacío
app.get('/api/lyrics/health', (req, res) => {
  res.json({ status: 'ok', service: 'lyrics', message: 'Pendiente de implementación' });
});

app.listen(PORT, '0.0.0.0', () =>
  console.log(`🚀 Lyrics service listo en puerto ${PORT}`)
);