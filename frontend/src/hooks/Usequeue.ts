import { useState, useCallback, useRef } from 'react';
import { API, authHeaders } from '../lib/api';
import { usePremium } from './usePremium';

const BASE = API.player;

export interface QueueMeta {
  artist: number; genre: number; recent: number; explore: number;
}

export const useQueue = () => {
  const [queue,   setQueue]   = useState<any[]>([]);
  const [meta,    setMeta]    = useState<QueueMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const lastRegistered = useRef<string | null>(null);
  const { isPremium } = usePremium();

  const registerPlay = useCallback(async (songId: string) => {
    if (lastRegistered.current === songId) return;
    lastRegistered.current = songId;
    try {
      await fetch(`${BASE}/played`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ songId }),
      });
    } catch (err) { console.error('registerPlay:', err); }
  }, []);

  const loadQueue = useCallback(async (songId: string) => {
    setLoading(true);
    try {
      if (isPremium) {
        // Premium: cola recomendada por IA
        const res  = await fetch(`${BASE}/next?songId=${songId?._id ?? songId}`, { headers: authHeaders() });
        const data = await res.json();
        setQueue(data.queue ?? []);
        setMeta(data.meta   ?? null);
      } else {
        // Gratuito: canciones aleatorias de la biblioteca
        const res  = await fetch(`${API.songs}/random?limit=8`, { headers: authHeaders() });
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : data.songs ?? []);
        setMeta(null);
      }
    } catch (err) {
      console.error('loadQueue:', err);
      setQueue([]);
    } finally {
      setLoading(false);
    }
  }, [isPremium]);

  const getNext = useCallback(async (currentSong: any): Promise<any | null> => {
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      return next;
    }
    if (currentSong?._id) {
      await loadQueue(currentSong._id);
      return null;
    }
    return null;
  }, [queue, loadQueue]);

  const getPrev = useCallback(
    (history: any[]): any | null => history[history.length - 1] ?? null, []
  );

  return { queue, meta, loading, registerPlay, loadQueue, getNext, getPrev };
};