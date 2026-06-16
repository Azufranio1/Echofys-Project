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

export interface DJChatMessage {
  role:    'user' | 'assistant';
  content: string;
}

export interface DJState {
  active:      boolean;
  loading:     boolean;
  narration:   string;
  mood:        string;
  energyLevel: number;
  songsPlayed: number;
  queue:       DJSong[];        // cola local de canciones pre-cargadas
  messages:    DJChatMessage[]; // historial de chat con el DJ
  chatLoading: boolean;         // loading específico del chat (no bloquea reproducción)
}

export interface UseDJSession {
  djState:      DJState;
  startDJ:      (mood: string) => Promise<DJSong | null>;
  nextDJ:       (currentSongId: string, signal: ListenSignal) => Promise<DJSong | null>;
  endDJ:        () => Promise<void>;
  resetDJ:      () => void;
  sendDJMessage: (message: string) => Promise<DJMessageResult | null>;
}

export interface DJMessageResult {
  action:         'CHAT_ONLY' | 'PLAY_NOW' | 'ADD_QUEUE';
  dj_speech:      string;
  song:           DJSong | null;
  queue_addition: DJSong[];
}

const INITIAL_STATE: DJState = {
  active:      false,
  loading:     false,
  narration:   '',
  mood:        '',
  energyLevel: 5,
  songsPlayed: 0,
  queue:       [],
  messages:    [],
  chatLoading: false,
};

const REFILL_THRESHOLD = 3;   // pedir más canciones cuando queden ≤ 3 en cola
const QUEUE_SIZE       = 10;  // cuántas canciones pedir cada vez


// ══════════════════════════════════════════════════════
//  Hook principal
// ══════════════════════════════════════════════════════
export const useDJSession = (): UseDJSession => {
  const [djState, setDJState] = useState<DJState>(INITIAL_STATE);

  const pendingRef    = useRef(false);   // evitar llamadas duplicadas al modelo
  const refillingRef  = useRef(false);   // evitar refills simultáneos


  const patch = useCallback((updates: Partial<DJState>) => {
    setDJState(prev => ({ ...prev, ...updates }));
  }, []);


  // ── Pedir cola de canciones al backend ─────────────
  const fetchQueue = useCallback(async (
    lastSongId:   string,
    signal:       ListenSignal,
    count:        number = QUEUE_SIZE,
  ): Promise<DJSong[]> => {
    try {
      const res = await fetch(`${API.ai}/dj/queue`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({
          current_song_id: lastSongId,
          listen_signal:   signal,
          count,
        }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.songs ?? [];
    } catch {
      return [];
    }
  }, []);


  // ── Refill silencioso cuando la cola está baja ─────
  const refillIfNeeded = useCallback(async (
    queue:      DJSong[],
    lastSongId: string,
    signal:     ListenSignal,
  ) => {
    if (refillingRef.current || queue.length > REFILL_THRESHOLD) return;
    refillingRef.current = true;
    try {
      const newSongs = await fetchQueue(lastSongId, signal, QUEUE_SIZE);
      if (newSongs.length > 0) {
        setDJState(prev => ({
          ...prev,
          queue: [...prev.queue, ...newSongs],
        }));
      }
    } finally {
      refillingRef.current = false;
    }
  }, [fetchQueue]);


  // ── Iniciar sesión DJ ──────────────────────────────
  const startDJ = useCallback(async (mood: string): Promise<DJSong | null> => {
    if (pendingRef.current) return null;
    pendingRef.current = true;

    patch({ loading: true, narration: '', mood: '', queue: [], messages: [] });

    try {
      const res = await fetch(`${API.ai}/dj/start`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ mood, count: QUEUE_SIZE }),
      });

      if (!res.ok) throw new Error(`DJ start failed: ${res.status}`);

      const data = await res.json();

      // El backend devuelve la primera canción + una cola de siguientes
      const firstSong: DJSong | null = data.song  ?? null;
      const preQueue:  DJSong[]      = data.queue  ?? [];

      patch({
        active:      true,
        loading:     false,
        narration:   data.intro              ?? '',
        mood:        data.mood               ?? mood,
        energyLevel: data.session?.energy_target ?? 5,
        songsPlayed: 1,
        queue:       preQueue,
      });

      return firstSong;

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
    signal:        ListenSignal,
  ): Promise<DJSong | null> => {
    if (!djState.active) return null;

    // Consumir de la cola local sin llamar al modelo
    const [next, ...remaining] = djState.queue;

    if (next) {
      patch({
        queue:       remaining,
        songsPlayed: djState.songsPlayed + 1,
        // La narración de transición llega del /dj/next solo cuando
        // el modelo genera una específica — aquí usamos la de la cola
        narration: next.transition as string ?? '',
      });

      // Refill silencioso si la cola está baja
      refillIfNeeded(remaining, currentSongId, signal);

      // Notificar al backend la señal (actualiza energy_target en Redis)
      sendSignal(currentSongId, signal);

      return next;
    }

    // Cola vacía — llamar al modelo directamente (fallback)
    if (pendingRef.current) return null;
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
        narration:   data.transition             ?? '',
        energyLevel: data.session?.energy_target ?? djState.energyLevel,
        songsPlayed: data.session?.songs_played  ?? djState.songsPlayed + 1,
        queue:       [],
      });

      // Refill inmediato después del fallback
      if (data.song) {
        refillIfNeeded([], data.song._id, signal);
      }

      return data.song ?? null;

    } catch (err) {
      console.error('[DJ] nextDJ error:', err);
      patch({ loading: false });
      return null;
    } finally {
      pendingRef.current = false;
    }
  }, [djState, patch, refillIfNeeded]);


  // ── Chat interactivo con el DJ ─────────────────────
  const sendDJMessage = useCallback(async (
    message: string,
  ): Promise<DJMessageResult | null> => {
    if (!djState.active) return null;
    const trimmed = message.trim();
    if (!trimmed) return null;

    // Optimistic: añadir mensaje del usuario al historial local
    setDJState(prev => ({
      ...prev,
      chatLoading: true,
      messages: [...prev.messages, { role: 'user', content: trimmed }],
    }));

    try {
      const res = await fetch(`${API.ai}/dj/message`, {
        method:  'POST',
        headers: authHeaders(),
        body:    JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) throw new Error(`DJ message failed: ${res.status}`);

      const data = await res.json();
      const result: DJMessageResult = {
        action:         data.action ?? 'CHAT_ONLY',
        dj_speech:      data.dj_speech ?? '',
        song:           data.song ?? null,
        queue_addition: data.queue_addition ?? [],
      };

      setDJState(prev => {
        let queue = prev.queue;
        let songsPlayed = prev.songsPlayed;
        let narration = prev.narration;

        if (result.action === 'PLAY_NOW' && result.song) {
          // Cambio inmediato de canción — el componente padre debe
          // reproducirla (ver retorno de esta función)
          songsPlayed = prev.songsPlayed + 1;
          narration = result.dj_speech;
        } else if (result.action === 'ADD_QUEUE' && result.queue_addition.length) {
          queue = [...prev.queue, ...result.queue_addition];
        }

        return {
          ...prev,
          chatLoading: false,
          queue,
          songsPlayed,
          narration,
          energyLevel: data.session?.energy_target ?? prev.energyLevel,
          mood:        data.session?.mood ?? prev.mood,
          messages: [...prev.messages, { role: 'assistant', content: result.dj_speech }],
        };
      });

      return result;

    } catch (err) {
      console.error('[DJ] sendDJMessage error:', err);
      setDJState(prev => ({
        ...prev,
        chatLoading: false,
        messages: [...prev.messages, {
          role: 'assistant',
          content: 'Uy, se me cortó la señal un segundo. ¿Puedes repetirlo?',
        }],
      }));
      return null;
    }
  }, [djState.active]);


  // ── Terminar sesión ────────────────────────────────
  const endDJ = useCallback(async () => {
    try {
      await fetch(`${API.ai}/dj/session`, {
        method:  'DELETE',
        headers: authHeaders(),
      });
    } catch {
      // TTL de Redis limpiará la sesión
    } finally {
      setDJState(INITIAL_STATE);
      pendingRef.current   = false;
      refillingRef.current = false;
    }
  }, []);


  // ── Reset local ────────────────────────────────────
  const resetDJ = useCallback(() => {
    setDJState(INITIAL_STATE);
    pendingRef.current   = false;
    refillingRef.current = false;
  }, []);


  return { djState, startDJ, nextDJ, endDJ, resetDJ, sendDJMessage };
};


// ── Helper: notificar señal al backend sin bloquear ──
const sendSignal = async (songId: string, signal: ListenSignal) => {
  try {
    await fetch(`${API.player}/listen-signal`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ songId, signal, progressPct: 100 }),
    });
  } catch {
    // Silenciar
  }
};