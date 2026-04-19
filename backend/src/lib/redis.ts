// src/lib/redis.ts
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://echofy-redis:6379'; // <--- USA EL NOMBRE DEL SERVICIO

export const redisClient = createClient({ url: redisUrl });

export const connectRedis = async () => {
    if (!redisClient.isOpen) {
        await redisClient.connect();
    }
};