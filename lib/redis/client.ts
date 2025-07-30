import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error('Missing required Upstash Redis environment variables');
    }

    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    logger.info('REDIS', 'Redis client initialized');
  }

  return redisClient;
}
