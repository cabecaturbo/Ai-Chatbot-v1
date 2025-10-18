import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import IORedis from 'ioredis';

function buildRateLimiter() {
  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    return rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  const client = new IORedis(redisUrl);
  return rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      sendCommand: (command: string, ...args: string[]) => client.call(command, ...args) as any,
    }),
  });
}

export { buildRateLimiter };
