import { create } from 'zustand';

// Definimos cómo es una canción para que TypeScript no se queje
interface Song {
  _id: string;
  title: string;
  artist: string;
  driveId: string;
  duration?: string;
  coverUrl?: string;
}

// Definimos qué puede hacer nuestro "almacén" de música
interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  // Acciones para cambiar el estado
  setCurrentSong: (song: Song) => void;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setQueue: (songs: Song[]) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentSong: null,
  isPlaying: false,
  queue: [],

  // Al elegir una canción, la ponemos como actual y activamos el play
  setCurrentSong: (song) => set({ 
    currentSong: song, 
    isPlaying: true 
  }),

  // Cambia de Play a Pausa y viceversa
  togglePlay: () => set((state) => ({ 
    isPlaying: !state.isPlaying 
  })),

  // Fuerza un estado específico (útil para eventos del sistema)
  setPlaying: (playing) => set({ isPlaying: playing }),

  // Por si luego quieres armar una lista de reproducción
  setQueue: (songs) => set({ queue: songs }),
}));