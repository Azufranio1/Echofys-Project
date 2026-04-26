import { Request, Response } from 'express';
import Favorite from '../models/Favorite';

export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const { songId } = req.body;
    const userId = req.user.id;

    const existing = await Favorite.findOne({ userId, songId });

    if (existing) {
      await Favorite.findByIdAndDelete(existing._id);
      return res.status(200).json({ isFavorite: false });
    }

    const newFav = new Favorite({ userId, songId });
    await newFav.save();
    return res.status(201).json({ isFavorite: true });
  } catch (error) {
    return res.status(500).json({ message: "Error en el servidor" });
  }
};

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const favorites = await Favorite.find({ userId });
    return res.status(200).json(favorites);
  } catch (error) {
    return res.status(500).json({ message: "Error en el servidor" });
  }
};