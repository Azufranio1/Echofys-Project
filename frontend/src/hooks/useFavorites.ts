import { useState, useEffect, useCallback } from 'react';

// Set de IDs de canciones que el usuario tiene como favoritas
let globalFavoriteIds: Set<string> = new Set();
// Listeners para notificar a todos los componentes suscritos
const listeners: Set<() => void> = new Set();

const notify = () => listeners.forEach((fn) => fn());

const getToken = () => localStorage.getItem('token');

// Carga inicial — se llama una vez al montar la app
export const loadFavorites = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/favorites', {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    // El GET devuelve array de objetos Favorite con songId
    globalFavoriteIds = new Set(
      data.map((f: any) => f.songId?.toString() ?? f.songId)
    );
    notify();
  } catch (err) {
    console.error('Error cargando favoritos:', err);
  }
};

export const useFavorites = () => {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  const isFavorite = useCallback(
    (songId: string) => globalFavoriteIds.has(songId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalFavoriteIds.size]
  );

  const toggleFavorite = useCallback(async (songId: string) => {
    // Optimistic update
    const wasFav = globalFavoriteIds.has(songId);
    if (wasFav) globalFavoriteIds.delete(songId);
    else globalFavoriteIds.add(songId);
    notify();

    try {
      const res = await fetch('http://localhost:8080/api/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ songId }),
      });
      const data = await res.json();
      // Sincronizar con lo que dice el backend
      if (data.isFavorite) globalFavoriteIds.add(songId);
      else globalFavoriteIds.delete(songId);
      notify();
    } catch (err) {
      // Revertir si falla
      if (wasFav) globalFavoriteIds.add(songId);
      else globalFavoriteIds.delete(songId);
      notify();
      console.error('Error toggling favorito:', err);
    }
  }, []);

  return { isFavorite, toggleFavorite };
};