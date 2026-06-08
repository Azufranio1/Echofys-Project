import { redisClient } from './redis';

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redisClient.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {}
};

export const CACHE_KEYS = {
  allArtists:    ()                   => `artists:all`,
  artistProfile: (slug: string)       => `artist:${slug}:profile`,
  artistTop:     (slug: string)       => `artist:${slug}:top`,
  artistAlbums:  (slug: string)       => `artist:${slug}:albums`,
};

export const TTL = {
  allArtists:    60 * 30,   // 30 min
  artistProfile: 60 * 60,   // 1 hora
};
