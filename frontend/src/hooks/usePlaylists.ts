import { useState, useEffect, useCallback } from 'react';

export interface Playlist {
  _id: string;
  name: string;
  isPublic: boolean;
  songs: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
}

const BASE = 'http://localhost:8080/api/playlists';
const getToken = () => localStorage.getItem('token');
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE, { headers: headers() });
      const data = await res.json();
      setPlaylists(Array.isArray(data) ? data : []);
    } catch {
      setError('Error cargando playlists');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async (name: string, isPublic: boolean): Promise<Playlist | null> => {
    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ name, isPublic }),
      });
      const data = await res.json();
      setPlaylists(prev => [data, ...prev]);
      return data;
    } catch {
      return null;
    }
  };

  const update = async (id: string, patch: { name?: string; isPublic?: boolean }) => {
    try {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      setPlaylists(prev => prev.map(p => p._id === id ? data : p));
    } catch {}
  };

  const remove = async (id: string) => {
    try {
      await fetch(`${BASE}/${id}`, { method: 'DELETE', headers: headers() });
      setPlaylists(prev => prev.filter(p => p._id !== id));
    } catch {}
  };

  const addSong = async (playlistId: string, songId: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE}/${playlistId}/songs`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ songId }),
      });
      if (res.status === 409) return false; // ya existe
      const data = await res.json();
      setPlaylists(prev => prev.map(p => p._id === playlistId ? data : p));
      return true;
    } catch {
      return false;
    }
  };

  const removeSong = async (playlistId: string, songId: string) => {
    try {
      const res = await fetch(`${BASE}/${playlistId}/songs/${songId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      const data = await res.json();
      setPlaylists(prev => prev.map(p => p._id === playlistId ? data : p));
    } catch {}
  };

  const hasSong = (playlistId: string, songId: string): boolean => {
    const pl = playlists.find(p => p._id === playlistId);
    return pl ? pl.songs.includes(songId) : false;
  };

  return { playlists, loading, error, create, update, remove, addSong, removeSong, hasSong, reload: load };
};