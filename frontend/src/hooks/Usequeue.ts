import { useState, useCallback, useRef } from 'react';

const BASE = 'http://localhost:8080/api/queue';
const getToken = () => localStorage.getItem('token');
const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

export interface QueueMeta {
  artist: number;
  genre: number;
  recent: number;
  explore: number;
}

export const useQueue = () => {
  const [queue, setQueue]     = useState<any[]>([]);
  const [meta, setMeta]       = useState<QueueMeta | null>(null);
  const [loading, setLoading] = useState(false);

  // Evitar doble registro si el componente re-renderiza
  const lastRegistered = useRef<string | null>(null);

  /* Registra que el usuario reprodujo una canción */
  const registerPlay = useCallback(async (songId: string) => {
    if (lastRegistered.current === songId) return;
    lastRegistered.current = songId;
    try {
      await fetch(`${BASE}/played`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ songId }),
      });
    } catch (err) {
      console.error('registerPlay:', err);
    }
  }, []);

  /* Carga la cola recomendada para una canción */
  const loadQueue = useCallback(async (songId: string) => {
    setLoading(true);
    try {
      const res  = await fetch(`${BASE}/next?songId=${songId}`, { headers: authHeaders() });
      const data = await res.json();
      setQueue(data.queue  ?? []);
      setMeta(data.meta    ?? null);
    } catch (err) {
      console.error('loadQueue:', err);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /* Avanza al siguiente de la cola; si se agota, recarga */
  const getNext = useCallback(
    async (currentSong: any): Promise<any | null> => {
      if (queue.length > 0) {
        const [next, ...rest] = queue;
        setQueue(rest);
        return next;
      }
      // Cola vacía → recarga
      if (currentSong?._id) {
        await loadQueue(currentSong._id);
        return null; // llamar de nuevo tras la carga
      }
      return null;
    },
    [queue, loadQueue]
  );

  /* Retrocede: simplemente devuelve null (el Player maneja su propio historial) */
  const getPrev = useCallback(
    (history: any[]): any | null => history[history.length - 1] ?? null,
    []
  );

  return { queue, meta, loading, registerPlay, loadQueue, getNext, getPrev };
};