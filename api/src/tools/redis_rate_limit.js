const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const IORedis = require('ioredis');

function buildRateLimiter() {
  const redisUrl = process.env.REDIS_URL;
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
      sendCommand: (...args) => client.call(...args),
    }),
  });
}

module.exports = { buildRateLimiter };


