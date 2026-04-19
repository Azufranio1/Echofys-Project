// backend/src/controllers/songController.ts
import { Request, Response } from 'express';
import { Song } from '../models/Song';
import { redisClient } from '../config/redis'; // Asegúrate de tener configurado el cliente

export const getAllSongs = async (req: Request, res: Response) => {
  try {
    // 1. Intentar obtener del cache
    const cacheData = await redisClient.get('catalog:all');
    if (cacheData) {
      console.log("⚡ Servido desde Redis");
      return res.json(JSON.parse(cacheData));
    }

    // 2. Si no está en cache, ir a MongoDB
    const songs = await Song.find({ status: 'pending' }); // O el status que decidas
    
    // 3. Guardar en Redis por 10 minutos (600 segundos)
    await redisClient.setEx('catalog:all', 600, JSON.stringify(songs));

    console.log("🍃 Servido desde MongoDB");
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el catálogo' });
  }
};