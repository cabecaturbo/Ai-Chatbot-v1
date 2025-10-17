import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { createServer } from 'http';
import router from './router.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers[set-cookie]',
      'CRISP_TOKEN_IDENTIFIER',
      'CRISP_TOKEN_KEY',
      'OPENAI_API_KEY'
    ],
    remove: true
  }
});

const app = express();
app.set('trust proxy', true);
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

// Mount routes
app.use(router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  req.log?.error({ err }, 'Unhandled error');
  if (!res.headersSent) {
    res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

const server = createServer(app);
// Max 60s per request
server.setTimeout(60_000);

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Netia Crisp Bot listening');
});


