import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });

redis.on("error", (err) => console.error("[lyrics] Redis error:", err));
redis.on("connect", () => console.log("[lyrics] Redis conectado"));

export const connectRedis = async (): Promise<void> => {
  await redis.connect();
};

export default redis;