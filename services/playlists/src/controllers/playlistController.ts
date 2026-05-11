import { Request, Response } from 'express';
import Playlist from '../models/playlist';
import mongoose from 'mongoose';

// ── GET /api/playlists ── mis playlists
export const getMyPlaylists = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const playlists = await Playlist.find({ userId }).sort({ updatedAt: -1 });
    return res.json(playlists);
  } catch {
    return res.status(500).json({ message: 'Error al obtener playlists' });
  }
};

// ── GET /api/playlists/:id ── detalle con canciones populadas
export const getPlaylistById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findById(id).populate('songs');
    if (!playlist) return res.status(404).json({ message: 'Playlist no encontrada' });

    // Solo el dueño puede ver playlists privadas
    if (!playlist.isPublic && playlist.userId !== userId) {
      return res.status(403).json({ message: 'Acceso denegado' });
    }

    return res.json(playlist);
  } catch {
    return res.status(500).json({ message: 'Error al obtener playlist' });
  }
};

// ── POST /api/playlists ── crear
export const createPlaylist = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { name, isPublic = false } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'El nombre es obligatorio' });
    }

    const playlist = new Playlist({ userId, name: name.trim(), isPublic, songs: [] });
    await playlist.save();
    return res.status(201).json(playlist);
  } catch {
    return res.status(500).json({ message: 'Error al crear playlist' });
  }
};

// ── PATCH /api/playlists/:id ── editar nombre / visibilidad
export const updatePlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, isPublic } = req.body;

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: 'Playlist no encontrada' });
    if (playlist.userId !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    if (name !== undefined)     playlist.name     = name.trim();
    if (isPublic !== undefined) playlist.isPublic = isPublic;

    await playlist.save();
    return res.json(playlist);
  } catch {
    return res.status(500).json({ message: 'Error al actualizar playlist' });
  }
};

// ── DELETE /api/playlists/:id ── eliminar
export const deletePlaylist = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: 'Playlist no encontrada' });
    if (playlist.userId !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    await Playlist.findByIdAndDelete(id);
    return res.json({ message: 'Playlist eliminada' });
  } catch {
    return res.status(500).json({ message: 'Error al eliminar playlist' });
  }
};

// ── POST /api/playlists/:id/songs ── añadir canción
export const addSong = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { songId } = req.body;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(songId)) {
      return res.status(400).json({ message: 'songId inválido' });
    }

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: 'Playlist no encontrada' });
    if (playlist.userId !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    const oid = new mongoose.Types.ObjectId(songId);

    // Evitar duplicados
    if (playlist.songs.some(s => s.equals(oid))) {
      return res.status(409).json({ message: 'La canción ya está en la playlist' });
    }

    playlist.songs.push(oid);
    await playlist.save();
    return res.json(playlist);
  } catch {
    return res.status(500).json({ message: 'Error al añadir canción' });
  }
};

// ── DELETE /api/playlists/:id/songs/:songId ── quitar canción
export const removeSong = async (req: Request, res: Response) => {
  try {
    const { id, songId } = req.params;
    const userId = req.user.id;

    const playlist = await Playlist.findById(id);
    if (!playlist) return res.status(404).json({ message: 'Playlist no encontrada' });
    if (playlist.userId !== userId) return res.status(403).json({ message: 'Acceso denegado' });

    playlist.songs = playlist.songs.filter(s => s.toString() !== songId) as any;
    await playlist.save();
    return res.json(playlist);
  } catch {
    return res.status(500).json({ message: 'Error al quitar canción' });
  }
};