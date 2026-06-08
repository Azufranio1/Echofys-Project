import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://echofy-redis:6379';

export const redisClient = createClient({ url: redisUrl });

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};
