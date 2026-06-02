import { useState, useRef, useCallback } from 'react';
import { API, authHeaders } from '../lib/api';

// ── Tipos ──────────────────────────────────────────────
export type ListenSignal = 'completed' | 'skipped_early' | 'skipped_mid';

export interface DJSong {
  _id:      string;
  title:    string;
  artist:   string;
  genre?:   string;
  artwork?: string;
  driveId?: string;
}

export interface DJState {
  active:      boolean;
  loading:     boolean;
  narration:   string;   // última frase del DJ (intro o transición)
  mood:        string;   // mood clasificado por el modelo ligero
  energyLevel: number;   // 1-9, nivel de energía actual de la sesión
  songsPlayed: number;
}

export interface UseDJSession {
  djState:    DJState;
  startDJ:    (mood: string) => Promise<DJSong | null>;
  nextDJ:     (currentSongId: string, signal: ListenSignal) => Promise<DJSong | null>;
  endDJ:      () => Promise<void>;
  resetDJ:    () => void;
}

// ── Estado inicial ─────────────────────────────────────
const INITIAL_STATE: DJState = {
  active:      false,
  loading:     false,
  narration:   '',
  mood:        '',
  energyLevel: 5,
  songsPlayed: 0,
};

// ══════════════════════════════════════════════════════
//  Hook principal
// ══════════════════════════════════════════════════════
export const useDJSession = (): UseDJSession => {
  const [djState, setDJState] = useState<DJState>(INITIAL_STATE);

  // Evitar llamadas duplicadas si el modelo tarda
  const pendingRef = useRef(false);


  // ── Actualizar estado parcialmente ──────────────────
  const patch = useCallback((updates: Partial<DJState>) => {
    setDJState(prev => ({ ...prev, ...updates }));
  }, []);


  // ── Iniciar sesión DJ ──────────────────────────────
  const startDJ = useCallback(async (mood: string): Promise<DJSong | null> => {
    if (pendingRef.current) return null;
    pendingRef.current = true;

    patch({ loading: true, narration: '', mood: '' });

    try {
      const res = await fetch(`${API.ai}/dj/start`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ mood }),
      });

      if (!res.ok) throw new Error(`DJ start failed: ${res.status}`);

      const data = await res.json();

      patch({
        active:      true,
        loading:     false,
        narration:   data.intro        ?? '',
        mood:        data.mood         ?? mood,
        energyLevel: data.session?.energy_target ?? 5,
        songsPlayed: 1,
      });

      return data.song ?? null;

    } catch (err) {
      console.error('[DJ] startDJ error:', err);
      patch({ loading: false });
      return null;
    } finally {
      pendingRef.current = false;
    }
  }, [patch]);


  // ── Siguiente canción ──────────────────────────────
  const nextDJ = useCallback(async (
    currentSongId: string,
    signal: ListenSignal,
  ): Promise<DJSong | null> => {
    if (!djState.active || pendingRef.current) return null;
    pendingRef.current = true;

    patch({ loading: true });

    try {
      const res = await fetch(`${API.ai}/dj/next`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({
          current_song_id: currentSongId,
          listen_signal:   signal,
        }),
      });

      if (!res.ok) throw new Error(`DJ next failed: ${res.status}`);

      const data = await res.json();

      patch({
        loading:     false,
        narration:   data.transition         ?? '',
        energyLevel: data.session?.energy_target ?? djState.energyLevel,
        songsPlayed: data.session?.songs_played  ?? djState.songsPlayed + 1,
      });

      return data.song ?? null;

    } catch (err) {
      console.error('[DJ] nextDJ error:', err);
      patch({ loading: false });
      return null;
    } finally {
      pendingRef.current = false;
    }
  }, [djState.active, djState.energyLevel, djState.songsPlayed, patch]);


  // ── Terminar sesión ────────────────────────────────
  const endDJ = useCallback(async () => {
    try {
      await fetch(`${API.ai}/dj/session`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
    } catch {
      // Silenciar — el TTL de Redis limpiará la sesión de todas formas
    } finally {
      setDJState(INITIAL_STATE);
      pendingRef.current = false;
    }
  }, []);


  // ── Reset local sin llamada al servidor ────────────
  const resetDJ = useCallback(() => {
    setDJState(INITIAL_STATE);
    pendingRef.current = false;
  }, []);


  return { djState, startDJ, nextDJ, endDJ, resetDJ };
};