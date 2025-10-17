const pino = require('pino');
const pinoHttp = require('pino-http');

const redact = {
  paths: ['req.headers.authorization', 'res.headers.set-cookie', 'password', 'token'],
  censor: '[redacted]'
};

const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact });

const httpLogger = pinoHttp({
  logger,
  useLevel: 'info',
  autoLogging: true,
});

module.exports = { logger, httpLogger };


