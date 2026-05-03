import { Request, Response } from 'express';
import Favorite from '../models/Favorite';
import { Music } from '../models/Music';
import { cacheDel, CACHE_KEYS } from '../lib/cache';

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { songId } = req.body;
    const userId = req.user.id;

    const existing = await Favorite.findOne({ userId, songId });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      await Music.findByIdAndUpdate(songId, { $inc: { likeCount: -1 } });
      await Music.updateOne({ _id: songId, likeCount: { $lt: 0 } }, { $set: { likeCount: 0 } });

      // Invalidar caché: stats + home + top global
      await cacheDel(
        CACHE_KEYS.userStats(userId),
        CACHE_KEYS.homeData(userId),
        CACHE_KEYS.globalTop()
      );

      return res.status(200).json({ isFavorite: false });
    }

    const newFav = new Favorite({ userId, songId });
    await newFav.save();
    await Music.findByIdAndUpdate(songId, { $inc: { likeCount: 1 } });

    // Invalidar caché
    await cacheDel(
      CACHE_KEYS.userStats(userId),
      CACHE_KEYS.homeData(userId),
      CACHE_KEYS.globalTop()
    );

    return res.status(201).json({ isFavorite: true });
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId    = req.user.id;
    const favorites = await Favorite.find({ userId });
    return res.status(200).json(favorites);
  } catch (error) {
    return res.status(500).json({ message: 'Error en el servidor' });
  }
};