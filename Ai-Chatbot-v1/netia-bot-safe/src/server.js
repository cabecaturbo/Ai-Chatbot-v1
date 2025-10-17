const express = require('express');
require('dotenv').config();
const helmet = require('helmet');
const path = require('path');
const cors = require('cors');
const Ajv = require('ajv');
const client = require('prom-client');
const { httpLogger } = require('./tools/logger');
const { buildRateLimiter } = require('./tools/redis_rate_limit');
const { ensureSchema, saveMessage, saveLead } = require('./tools/db');
const { verifySignature } = require('./tools/crisp_verify');

// Import the new LLM and intent detection modules
const { NetiaLLM } = require('./llm/answer');
const { IntentDetector } = require('./intents/detect');
const { redactPII } = require('./tools/sanitize');
const { getSystemPrompt, getFaqKb } = require('./tools/kb_cache');
const { generateSlots, createEvent } = require('./flows/calendar');
const { appendLead } = require('./tools/leads');

const app = express();
app.set('trust proxy', 1);

// Redirect any non-API browser request on apex to Framer; keep API routes on apex
app.use((req, res, next) => {
  const host = String(req.headers.host || '').split(':')[0].toLowerCase();
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
const allowedOrigins = String(process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser or same-origin
    if (allowedOrigins.length === 0) return callback(null, false);
    return callback(null, allowedOrigins.includes(origin));
  }
}));
app.use(httpLogger);
// Capture raw body for HMAC verification (e.g., Crisp webhooks)
app.use(express.json({
  limit: '200kb',
  verify: (req, _res, buf) => {
    try { req.rawBody = buf.toString('utf8'); } catch (_) { /* noop */ }
  }
}));

// Redis-backed rate limiter if REDIS_URL is set
app.use(buildRateLimiter());

// Metrics setup
const register = new client.Registry();
client.collectDefaultMetrics({ register });
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path'],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});
const llmRequestCounter = new client.Counter({
  name: 'llm_requests_total',
  help: 'Total number of LLM requests',
  labelNames: ['status'],
  registers: [register],
});
const llmRequestDuration = new client.Histogram({
  name: 'llm_request_duration_seconds',
  help: 'LLM request duration in seconds',
  buckets: [0.25, 0.5, 1, 2, 4, 8, 12],
  registers: [register],
});
const crispSendCounter = new client.Counter({
  name: 'crisp_send_total',
  help: 'Total number of Crisp send attempts',
  labelNames: ['status'],
  registers: [register],
});

app.use((req, res, next) => {
  const endTimer = httpRequestDuration.startTimer({ method: req.method, path: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, path: req.path, status: String(res.statusCode) });
    endTimer();
  });
  next();
});

app.get('/health', (_req, res) => {
  const uptimeSec = Math.floor(process.uptime());
  res.status(200).json({
    status: 'ok',
    env: process.env.NODE_ENV || 'development',
    uptime_sec: uptimeSec,
    version: process.env.APP_VERSION || process.env.GIT_SHA || '0.1.0',
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Serve landing page and static assets
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (_req, res) => {
  try {
    const fs = require('fs');
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');
    html = html.replace('__CRISP_WEBSITE_ID__', String(process.env.CRISP_WEBSITE_ID || ''));
    res.set('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (e) {
    return res.status(500).send('Landing unavailable');
  }
});

const flags = {
  DRY_RUN: process.env.DRY_RUN !== 'false',
  KILL_SWITCH: process.env.KILL_SWITCH === 'true',
  PORT: Number(process.env.PORT || 3000),
  DEMO_MODE: process.env.DEMO_MODE === 'true',
};

// Initialize AI components
const llm = new NetiaLLM(flags.DRY_RUN);
const intentDetector = new IntentDetector();

// Store conversation history (in production, use a proper database)
const conversationHistory = new Map();

// Ajv validation for Crisp webhook payload
const ajv = new Ajv({ allErrors: true, removeAdditional: 'failing' });
const crispWebhookSchema = {
  type: 'object',
  properties: {
    conversation_id: { type: 'string', minLength: 1 },
    message: { type: 'string', minLength: 1 },
  },
  required: ['conversation_id', 'message'],
  additionalProperties: true,
};
const validateCrisp = ajv.compile(crispWebhookSchema);

function normalizeCrispPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  // If already in internal format
  if (payload.conversation_id && payload.message) {
    return {
      conversation_id: String(payload.conversation_id),
      message: String(payload.message),
    };
  }
  const event = payload.event || payload.type;
  const sessionId = payload.session_id || payload.conversation_id || (payload.data && payload.data.session_id);
  let text = '';
  if (payload.data && typeof payload.data === 'object') {
    text = payload.data.text || payload.data.content || payload.data.message || (payload.data.block && payload.data.block.text) || '';
  }
  if (event && sessionId && text) {
    return { conversation_id: String(sessionId), message: String(text) };
  }
  return null;
}

app.post('/crisp/webhook', async (req, res) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const secret = process.env.CRISP_WEBHOOK_SECRET;
  if (!verifySignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const incoming = req.body;
  const payload = normalizeCrispPayload(incoming);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload', details: 'Unsupported Crisp webhook format' });
  }
  const safeLog = JSON.stringify({
    conversation_id: payload && payload.conversation_id,
    message: payload && redactPII(payload.message),
  });
  console.log('[WEBHOOK] payload', safeLog);

  if (!validateCrisp(payload)) {
    return res.status(400).json({ error: 'Invalid payload', details: validateCrisp.errors });
  }

  try {
    const message = String(payload.message || '');
    const conversationId = payload.conversation_id;
    
    // Get or create conversation history
    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, []);
    }
    const history = conversationHistory.get(conversationId);
    
    // Add user message to history
    history.push({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    });
    await saveMessage(conversationId, 'user', message);
    
    // Detect intent
    const intentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));
    
    // Generate response using LLM with metrics
    const endLlmTimer = llmRequestDuration.startTimer();
    let response;
    try {
      response = await llm.generateResponse(message, history, intentResult, {
      systemPrompt: getSystemPrompt(),
      faq: getFaqKb(),
      demoMode: flags.DEMO_MODE,
      });
      llmRequestCounter.inc({ status: 'ok' });
    } catch (e) {
      llmRequestCounter.inc({ status: 'error' });
      throw e;
    } finally {
      endLlmTimer();
    }
    
    // Add assistant response to history
    history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    await saveMessage(conversationId, 'assistant', response);
    
    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    if (flags.DRY_RUN) {
      console.log(`[CRISP][DRY] sendText conv=${conversationId}: ${response}`);
      console.log(`[CRISP][DRY] Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);
    } else {
      // Live send to Crisp
      const { sendText } = require('./tools/crisp_send');
      try {
        const websiteId = process.env.CRISP_WEBSITE_ID;
        await sendText({ websiteId, conversationId, text: response });
        crispSendCounter.inc({ status: 'ok' });
      } catch (e) {
        crispSendCounter.inc({ status: 'error' });
        console.error('Crisp send error:', e.message);
      }
    }

    // Append lead on booking/pricing intents (demo-safe)
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
      await saveLead(intentResult.intent);
    }

    return res.json({ 
      ok: true, 
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      missing_slots: intentResult.missing_slots,
      response 
    });
  } catch (err) {
    console.error('[ERROR]', err);
    return res.status(500).json({ ok: false, error: err.message });
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
  additionalProperties: true,
};
const validateChat = ajv.compile(chatSchema);

// Public chat endpoint for embedding on the website (e.g., Framer)
app.post('/chat', async (req, res) => {
  if (flags.KILL_SWITCH) {
    return res.status(200).json({ ok: true, skipped: true });
  }

  const body = req.body || {};
  if (!validateChat(body)) {
    return res.status(400).json({ ok: false, error: 'Invalid payload', details: validateChat.errors });
  }

  try {
    const conversationId = String(body.session_id);
    const message = String(body.message);

    if (!conversationHistory.has(conversationId)) {
      conversationHistory.set(conversationId, []);
    }
    const history = conversationHistory.get(conversationId);

    // Add user message
    history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });
    await saveMessage(conversationId, 'user', message);

    // Detect intent
    const intentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));

    // Generate response with metrics
    const endLlmTimer = llmRequestDuration.startTimer();
    let response;
    try {
      response = await llm.generateResponse(message, history, intentResult, {
        systemPrompt: getSystemPrompt(),
        faq: getFaqKb(),
        demoMode: flags.DEMO_MODE,
      });
      llmRequestCounter.inc({ status: 'ok' });
    } catch (e) {
      llmRequestCounter.inc({ status: 'error' });
      throw e;
    } finally {
      endLlmTimer();
    }

    // Add assistant response
    history.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });
    await saveMessage(conversationId, 'assistant', response);

    // Keep history bounded
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }

    // Optional lead capture on relevant intents
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
      await saveLead(intentResult.intent);
    }

    return res.json({
      ok: true,
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: intentResult.entities,
      missing_slots: intentResult.missing_slots,
      response,
    });
  } catch (err) {
    console.error('[ERROR]', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Calendar mock endpoints
app.get('/calendar/slots', (_req, res) => {
  res.json({ ok: true, slots: generateSlots(3) });
});

app.post('/calendar/book', (req, res) => {
  const slot = req.body && req.body.slot;
  const customer = req.body && req.body.customer;
  if (!slot) return res.status(400).json({ ok: false, error: 'slot required' });
  const event = createEvent(slot, customer || {});
  res.json({ ok: true, event });
});

app.listen(flags.PORT, async () => {
  console.log(
    `netia-bot-safe listening on port ${flags.PORT} (DRY_RUN=${flags.DRY_RUN}, KILL_SWITCH=${flags.KILL_SWITCH})`
  );
  try { await ensureSchema(); } catch (e) { console.error('DB schema init failed:', e.message); }
});

