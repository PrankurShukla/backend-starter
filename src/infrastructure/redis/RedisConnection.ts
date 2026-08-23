import IORedis from 'ioredis';
import type { Logger } from 'pino';

export function createRedisConnection(url: string, logger: Logger): IORedis {
  const redis = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });
  redis.on('error', error => logger.error({ err: error }, 'Redis connection error'));
  return redis;
}
