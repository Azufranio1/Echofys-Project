const HOST = 'http://localhost';

export const API = {
  auth:          `${HOST}:8081/api/auth`,
  songs:         `${HOST}:8082/api/songs`,
  player:        `${HOST}:8083/api/queue`,
  playlists:     `${HOST}:8084/api/playlists`,
  favorites:     `${HOST}:8085/api/favorites`,
  stats:         `${HOST}:8086/api/stats`,
  lyrics:        `${HOST}:8087/lyrics`,
  ai:            `${HOST}:8090/api/ai`,
  subscriptions: `${HOST}:8088`,
  artists:       `${HOST}:8089/api/artists`,   // ← NUEVO
} as const;

// Helper headers con token
export const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});
