import { redisClient } from './redis';

/**
 * Obtiene un valor de Redis y lo parsea como JSON.
 * Devuelve null si no existe o si Redis falla (fail-safe).
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await redisClient.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (err) {
    console.warn(`[cache] GET "${key}" falló:`, err);
    return null;
  }
};

/**
 * Guarda un valor en Redis como JSON con TTL en segundos.
 * Silencia errores para no romper el flujo principal.
 */
export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  try {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch (err) {
    console.warn(`[cache] SET "${key}" falló:`, err);
  }
};

/**
 * Elimina una o varias keys de Redis.
 */
export const cacheDel = async (...keys: string[]): Promise<void> => {
  try {
    if (keys.length > 0) await redisClient.del(keys);
  } catch (err) {
    console.warn(`[cache] DEL falló:`, err);
  }
};

// ── Keys centralizadas (evita strings mágicos) ──
export const CACHE_KEYS = {
  userStats:  (userId: string) => `user:stats:${userId}`,
  homeData:   (userId: string) => `user:home:${userId}`,
  globalTop:  ()               => `global:top20`,
  allSongs:   ()               => `songs:all`,
};

// ── TTLs en segundos ──
export const TTL = {
  stats:     60 * 60,      // 1 hora
  home:      60 * 15,      // 15 minutos
  globalTop: 60 * 15,      // 15 minutos
  allSongs:  60 * 60,      // 1 hora (ya lo tenías en musicRoutes)
};