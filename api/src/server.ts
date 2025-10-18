import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import path from 'path';
import cors from 'cors';
import Ajv from 'ajv';
import { register, Counter, Histogram } from 'prom-client';
import { httpLogger } from './tools/logger';
import { buildRateLimiter } from './tools/redis_rate_limit';
import { ensureSchema, saveMessage, saveLead, getTenantConfiguration, getTenantByWebsiteId, getTenantByTidioWebsiteId } from './tools/db';
import { authenticateApiKey } from './middleware/auth';
import { verifySignature } from './tools/crisp_verify';
import { verifySignature as verifyTidioSignature } from './tools/tidio_verify';

// Import the new LLM and intent detection modules
import { NetiaLLM } from './llm/answer';
import { IntentDetector } from './intents/detect';
import { redactPII } from './tools/sanitize';
import { getSystemPrompt, getFaqKb } from './tools/kb_cache';
import { generateSlots, createEvent } from './flows/calendar';
import { appendLead } from './tools/leads';

// Import types
import { 
  CrispPayload, 
  TidioPayload,
  IntentResult, 
  AIMessage as Message, 
  LLMContext,
  RuntimeFlags,
  HealthCheckResponse,
  ChatResponse
} from '@/types';

const app = express();
app.set('trust proxy', 1);

// Redirect any non-API browser request on apex to Framer; keep API routes on apex
app.use((req: Request, res: Response, next: NextFunction) => {
  const host = String(req.headers.host || '').split(':')[0]?.toLowerCase() || '';
  const isBrowserMethod = req.method === 'GET' || req.method === 'HEAD';
  const isApiPath = ['/health', '/metrics', '/crisp/webhook', '/calendar/', '/chat']
    .some((p) => req.path === p || req.path.startsWith(p));
  if (host === 'netia.ai' && isBrowserMethod && !isApiPath) {
    const target = 'https://www.netia.ai' + (req.originalUrl || '/');
    return res.redirect(301, target);
  }
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "https://client.crisp.chat"],
      "connect-src": ["'self'", "https://client.crisp.chat", "https://storage.crisp.chat"],
      "img-src": ["'self'", "data:", "https://storage.crisp.chat"],
      "frame-src": ["'self'", "https://client.crisp.chat"],
    }
  }
}));

// Robust CORS: allow comma-separated list of origins via CORS_ORIGIN
const allowedOrigins = String(process.env['CORS_ORIGIN'] || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (allowedOrigins.length === 0) return callback(null, false);
    return callback(null, allowedOrigins.includes(origin));
  }
}));

app.use(httpLogger);

// Capture raw body for HMAC verification (e.g., Crisp webhooks)
app.use(express.json({
  limit: '200kb',
  verify: (req: Request, _res: Response, buf: Buffer) => {
    try { 
      (req as any).rawBody = buf.toString('utf8'); 
    } catch (error) { 
      console.error('Error capturing raw body:', error);
    }
  }
}));

// Redis-backed rate limiter if REDIS_URL is set
app.use(buildRateLimiter());

// Metrics setup
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

const llmRequestCounter = new Counter({
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['status'],
  registers: [register],
});

const llmRequestDuration = new Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM request duration in seconds',
  buckets: [0.25, 0.5, 1, 2, 4, 8, 12],
  registers: [register],
});

const crispSendCounter = new Counter({
  name: 'crisp_send_total',
  help: 'Total number of Crisp send attempts',
  labelNames: ['status'],
  registers: [register],
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const endTimer = httpRequestDuration.startTimer({ method: req.method, path: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, path: req.path, status: String(res.statusCode) });
    endTimer();
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  const uptimeSec = Math.floor(process.uptime());
  const response: HealthCheckResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: uptimeSec,
    version: process.env['APP_VERSION'] || process.env['GIT_SHA'] || '0.1.0',
    database: 'connected', // TODO: Check actual database connection
    redis: 'connected' // TODO: Check actual Redis connection
  };
  res.status(200).json(response);
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Serve landing page and static assets
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (_req: Request, res: Response) => {
  try {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__CRISP_WEBSITE_ID__', String(process.env['CRISP_WEBSITE_ID'] || ''));
    res.set('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (error) {
    console.error('Error serving landing page:', error);
    return res.status(500).send('Landing unavailable');
  }
});

const flags: RuntimeFlags = {
  DRY_RUN: process.env['DRY_RUN'] !== 'false',
  KILL_SWITCH: process.env['KILL_SWITCH'] === 'true',
  PORT: Number(process.env['PORT'] || 3000),
  DEMO_MODE: process.env['DEMO_MODE'] === 'true',
};

// Initialize AI components
const llm = new NetiaLLM(flags.DRY_RUN);
const intentDetector = new IntentDetector();

// Store conversation history (in production, use a proper database)
const conversationHistory = new Map<string, Message[]>();

// Ajv validation for Crisp webhook payload
const ajv = new Ajv({ allErrors: true, removeAdditional: 'failing' });
const crispWebhookSchema = {
  type: 'object',
  properties: {
    website_id: { type: 'string', minLength: 1 },
    event: { type: 'string', minLength: 1 },
    data: {
      type: 'object',
      properties: {
        content: { type: 'string', minLength: 1 },
        from: { type: 'string' },
        timestamp: { type: 'number' },
        session_id: { type: 'string' }
      },
      required: ['content', 'from']
    },
    timestamp: { type: 'number' }
  },
  required: ['website_id', 'event', 'data'],
  additionalProperties: true,
};
const validateCrisp = ajv.compile(crispWebhookSchema);

function normalizeCrispPayload(payload: any): CrispPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  
  // Handle new Crisp webhook format
  if (payload.website_id && payload.event && payload.data) {
    return {
      website_id: String(payload.website_id),
      event: String(payload.event),
      data: {
        content: String(payload.data.content || ''),
        from: String(payload.data.from || 'user'),
        timestamp: Number(payload.data.timestamp || Date.now()),
        session_id: payload.data.session_id ? String(payload.data.session_id) : undefined
      },
      timestamp: Number(payload.timestamp || Date.now()),
      // Legacy fields for backward compatibility
      conversation_id: payload.data.session_id ? String(payload.data.session_id) : undefined,
      message: payload.data.content ? String(payload.data.content) : undefined
    };
  }
  
  // Legacy format support
  if (payload.conversation_id && payload.message) {
    return {
      website_id: '', // Will be filled by tenant lookup
      event: 'message:received',
      data: {
        content: String(payload.message),
        from: 'user',
        timestamp: Date.now(),
        session_id: String(payload.conversation_id)
      },
      timestamp: Date.now(),
      conversation_id: String(payload.conversation_id),
      message: String(payload.message)
    };
  }
  
  return null;
}

// Tidio webhook schema & validator
const tidioWebhookSchema = {
  type: 'object',
  properties: {
    event: { type: 'string', minLength: 1 },
    data: {
      type: 'object',
      properties: {
        message: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            content: { type: 'string', minLength: 1 },
            from: { type: 'string' },
            timestamp: { type: 'number' },
            conversation_id: { type: 'string' }
          },
          required: ['content', 'conversation_id']
        }
      }
    },
    timestamp: { type: 'number' }
  },
  required: ['event', 'data', 'timestamp'],
  additionalProperties: false,
};
const validateTidio = ajv.compile(tidioWebhookSchema);

function normalizeTidioPayload(payload: any): TidioPayload | null {
  if (!payload || typeof payload !== 'object') return null;
  
  // Handle Tidio webhook format
  if (payload.event && payload.data) {
    return {
      event: String(payload.event),
      data: {
        message: payload.data.message ? {
          id: String(payload.data.message.id || ''),
          content: String(payload.data.message.content || ''),
          from: payload.data.message.from === 'visitor' ? 'visitor' : 'operator',
          timestamp: Number(payload.data.message.timestamp || Date.now()),
          conversation_id: String(payload.data.message.conversation_id || ''),
          visitor_id: payload.data.message.visitor_id ? String(payload.data.message.visitor_id) : undefined,
          operator_id: payload.data.message.operator_id ? String(payload.data.message.operator_id) : undefined
        } : undefined,
        conversation: payload.data.conversation ? {
          id: String(payload.data.conversation.id || ''),
          visitor_id: String(payload.data.conversation.visitor_id || ''),
          status: String(payload.data.conversation.status || ''),
          created_at: Number(payload.data.conversation.created_at || Date.now())
        } : undefined,
        visitor: payload.data.visitor ? {
          id: String(payload.data.visitor.id || ''),
          email: payload.data.visitor.email ? String(payload.data.visitor.email) : undefined,
          name: payload.data.visitor.name ? String(payload.data.visitor.name) : undefined,
          custom_fields: payload.data.visitor.custom_fields || {}
        } : undefined
      },
      timestamp: Number(payload.timestamp || Date.now()),
      // Legacy fields for backward compatibility
      conversation_id: payload.data?.message?.conversation_id ? String(payload.data.message.conversation_id) : undefined,
      message: payload.data?.message?.content ? String(payload.data.message.content) : undefined
    };
  }
  
  return null;
}

app.post('/crisp/webhook', async (req: Request, res: Response) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const secret = process.env['CRISP_WEBHOOK_SECRET'];
  if (!verifySignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const incoming = req.body;
  const payload = normalizeCrispPayload(incoming);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload', details: 'Unsupported Crisp webhook format' });
  }

  const safeLog = JSON.stringify({
    website_id: payload && payload.website_id,
    conversation_id: payload && payload.conversation_id,
    message: payload && redactPII(payload.data?.content || payload.message),
  });
  console.log('[WEBHOOK] payload', safeLog);

  if (!validateCrisp(payload)) {
    return res.status(400).json({ error: 'Invalid payload', details: validateCrisp.errors });
  }

  try {
    // Identify tenant by website ID
    const tenant = await getTenantByWebsiteId(payload.website_id);
    if (!tenant) {
      console.error(`[WEBHOOK] No tenant found for website ID: ${payload.website_id}`);
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    const message = String(payload.data?.content || payload.message || '');
    const conversationId = String(payload.data?.session_id || payload.conversation_id || '');

    // Get or create conversation history
    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, []);
    }
    const history = conversationHistory.get(conversationId);
    if (!history) {
      return res.status(500).json({ ok: false, error: 'Failed to get conversation history' });
    }

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'user', message);

    // Detect intent
    const intentResult: IntentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));

    // Generate response using LLM with metrics
    const endLlmTimer = llmRequestDuration.startTimer();
    let response: string;
    try {
      const context: LLMContext = {
        systemPrompt: getSystemPrompt(),
        faq: getFaqKb(),
        demoMode: flags.DEMO_MODE,
      };
      response = await llm.generateResponse(message, history, intentResult, context);
      llmRequestCounter.inc({ status: 'ok' });
    } catch (error) {
      llmRequestCounter.inc({ status: 'error' });
      throw error;
    } finally {
      endLlmTimer();
    }

    // Add assistant response to history
    history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'assistant', response);

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    if (flags.DRY_RUN) {
      console.log(`[CRISP][DRY] sendText conv=${conversationId}: ${response}`);
      console.log(`[CRISP][DRY] Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);
    } else {
      // Live send to Crisp using tenant's specific website ID
      const { sendText } = require('./tools/crisp_send');
      try {
        // Use tenant's specific Crisp website ID (already retrieved)
        if (!tenant.crisp_website_id) {
          console.error(`[CRISP] No website ID found for tenant ${tenant.id}`);
          crispSendCounter.inc({ status: 'error' });
          return res.status(500).json({ 
            ok: false, 
            error: 'Tenant Crisp configuration not found' 
          });
        }
        
        await sendText({ websiteId: tenant.crisp_website_id, conversationId, text: response });
        crispSendCounter.inc({ status: 'ok' });
      } catch (error) {
        crispSendCounter.inc({ status: 'error' });
        console.error('Crisp send error:', error);
      }
    }

    // Append lead on booking/pricing intents (demo-safe)
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
      await saveLead(tenant.id, intentResult.intent, conversationId);
    }

    const chatResponse: ChatResponse = {
      ok: true,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      missing_slots: intentResult.missing_slots,
      response
    };

    return res.json(chatResponse);
  } catch (error) {
    console.error('[ERROR]', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Tidio webhook handler
app.post('/tidio/webhook', async (req: Request, res: Response) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const secret = process.env['TIDIO_WEBHOOK_SECRET'];
  if (!verifyTidioSignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const incoming = req.body;
  const payload = normalizeTidioPayload(incoming);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload', details: 'Unsupported Tidio webhook format' });
  }

  const safeLog = JSON.stringify({
    event: payload.event,
    conversation_id: payload.data?.message?.conversation_id || payload.data?.conversation?.id,
    message: payload.data?.message ? redactPII(payload.data.message.content) : 'No message',
  });
  console.log('[TIDIO WEBHOOK] payload', safeLog);

  if (!validateTidio(payload)) {
    return res.status(400).json({ error: 'Invalid payload', details: validateTidio.errors });
  }

  try {
    // For Tidio, we need to identify the tenant differently
    // Since Tidio doesn't use website_id in the same way, we'll need to use conversation data
    const conversationId = payload.data?.message?.conversation_id || payload.data?.conversation?.id;
    if (!conversationId) {
      console.error('[TIDIO WEBHOOK] No conversation ID found in payload');
      return res.status(400).json({ ok: false, error: 'No conversation ID found' });
    }

    // For now, we'll use a default tenant or implement tenant identification logic
    // This will need to be updated based on how you want to identify tenants with Tidio
    const tenant = await getTenantByTidioWebsiteId('default'); // This needs to be implemented
    if (!tenant) {
      console.error(`[TIDIO WEBHOOK] No tenant found for conversation: ${conversationId}`);
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    const message = String(payload.data?.message?.content || '');
    if (!message) {
      return res.status(400).json({ ok: false, error: 'No message content found' });
    }

    // Get or create conversation history
    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, []);
    }
    const history = conversationHistory.get(conversationId);
    if (!history) {
      return res.status(500).json({ ok: false, error: 'Failed to get conversation history' });
    }

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'user', message);

    // Detect intent
    const intentResult: IntentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));

    // Generate response using LLM with metrics
    const endLlmTimer = llmRequestDuration.startTimer();
    let response: string;
    try {
      const context: LLMContext = {
        systemPrompt: getSystemPrompt(),
        faq: getFaqKb(),
        demoMode: flags.DEMO_MODE,
      };
      response = await llm.generateResponse(message, history, intentResult, context);
      llmRequestCounter.inc({ status: 'ok' });
    } catch (error) {
      llmRequestCounter.inc({ status: 'error' });
      throw error;
    } finally {
      endLlmTimer();
    }

    // Add assistant response to history
    history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'assistant', response);

    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    if (flags.DRY_RUN) {
      console.log(`[TIDIO][DRY] sendText conv=${conversationId}: ${response}`);
      console.log(`[TIDIO][DRY] Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);
    } else {
      // Live send to Tidio
      const { sendText } = require('./tools/tidio_send');
      try {
        await sendText({ websiteId: 'default', conversationId, text: response });
        // Note: We'll need to add tidioSendCounter similar to crispSendCounter
      } catch (error) {
        console.error('Tidio send error:', error);
      }
    }

    // Append lead on booking/pricing intents (demo-safe)
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
      await saveLead(tenant.id, intentResult.intent, conversationId);
    }

    const chatResponse: ChatResponse = {
      ok: true,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      missing_slots: intentResult.missing_slots,
      response
    };

    return res.json(chatResponse);
  } catch (error) {
    console.error('[TIDIO ERROR]', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Public chat schema & validator (session-based, no HMAC)
const chatSchema = {
  type: 'object',
  properties: {
    session_id: { type: 'string', minLength: 1 },
    message: { type: 'string', minLength: 1 },
  },
  required: ['session_id', 'message'],
  additionalProperties: false,
};
const validateChat = ajv.compile(chatSchema);

app.post('/chat', authenticateApiKey, async (req: Request, res: Response) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  if (!validateChat(req.body)) {
    return res.status(400).json({ error: 'Invalid payload', details: validateChat.errors });
  }

  const { session_id: sessionId, message } = req.body as { session_id: string; message: string };

  try {
    // Get tenant from authenticated request
    const tenant = req.tenant!;
    const conversationId = `public-${sessionId}`;

    // Get or create conversation history
    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, []);
    }
    const history = conversationHistory.get(conversationId);
    if (!history) {
      return res.status(500).json({ ok: false, error: 'Failed to get conversation history' });
    }

    // Add user message to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'user', message);

    // Detect intent
    const intentResult: IntentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));

    // Generate response using LLM with metrics
    const endLlmTimer = llmRequestDuration.startTimer();
    let response: string;
    try {
      const context: LLMContext = {
        systemPrompt: getSystemPrompt(),
        faq: getFaqKb(),
        demoMode: flags.DEMO_MODE,
      };
      response = await llm.generateResponse(message, history, intentResult, context);
      llmRequestCounter.inc({ status: 'ok' });
    } catch (error) {
      llmRequestCounter.inc({ status: 'error' });
      throw error;
    } finally {
      endLlmTimer();
    }

    // Add assistant response to history
    history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveMessage(tenant.id, conversationId, 'assistant', response);

    // Keep history bounded
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Optional lead capture on relevant intents
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
      await saveLead(tenant.id, intentResult.intent, conversationId);
    }

    const chatResponse: ChatResponse = {
      ok: true,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      missing_slots: intentResult.missing_slots,
      response,
    };

    return res.json(chatResponse);
  } catch (error) {
    console.error('[ERROR]', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Tenant management endpoints
app.get('/api/v1/tenant/info', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tenant = req.tenant!;
    const tenantInfo = {
      id: tenant.tenantId,
      name: tenant.tenantName,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionPlan: tenant.subscriptionPlan,
      apiKeyName: tenant.name,
      permissions: tenant.permissions,
      lastUsedAt: tenant.lastUsedAt,
      createdAt: tenant.createdAt
    };
    
    res.json({ ok: true, tenant: tenantInfo });
  } catch (error) {
    console.error('Error getting tenant info:', error);
    res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.get('/api/v1/tenant/config/:configType', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tenant = req.tenant!;
    const { configType } = req.params;
    if (!configType) {
      return res.status(400).json({ ok: false, error: 'Config type is required' });
    }
    const config = await getTenantConfiguration(tenant.tenantId, configType);
    
    return res.json({ ok: true, configType, config });
  } catch (error) {
    console.error('Error getting tenant config:', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Calendar mock endpoints
app.get('/calendar/slots', (_req: Request, res: Response) => {
  const slots = generateSlots();
  res.json({ ok: true, slots });
});

app.post('/calendar/book', async (req: Request, res: Response) => {
  const { slot } = req.body;
  if (!slot) {
    return res.status(400).json({ error: 'Slot required' });
  }

  try {
    const event = await createEvent(slot);
    return res.json({ ok: true, event });
  } catch (error) {
    console.error('Booking error:', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.listen(flags.PORT, async () => {
  console.log(
    `netia-bot-safe listening on port ${flags.PORT} (DRY_RUN=${flags.DRY_RUN}, KILL_SWITCH=${flags.KILL_SWITCH})`
  );
  try { 
    await ensureSchema(); 
  } catch (error) { 
    console.error('DB schema init failed:', (error as Error).message); 
  }
});
