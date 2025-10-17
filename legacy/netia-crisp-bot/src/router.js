import { Router } from 'express';
import { webhookHandler } from './handlers/webhook.js';
import { healthHandler } from './handlers/health.js';

const router = Router();

router.post('/webhook/crisp', webhookHandler);
router.get('/healthz', healthHandler);

export default router;


