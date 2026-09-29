import Redis from 'ioredis';
import { env } from './env.js';

// Dedicated connection for general Redis operations (rate limiting, locks, deduplication)
export const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
});

redisClient.on('error', (err) => {
  console.error('[Redis Client Error]:', err.message);
});

redisClient.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

// Helper for BullMQ Redis connection options
export const getBullRedisConfig = () => {
  const url = new URL(env.REDIS_URL);
  return {
    host: url.hostname || 'localhost',
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
};
