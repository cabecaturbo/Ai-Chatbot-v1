const express = require('express');
require('dotenv').config();
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Ajv = require('ajv');
const client = require('prom-client');

// Import the new LLM and intent detection modules
const { NetiaLLM } = require('./llm/answer');
const { IntentDetector } = require('./intents/detect');
const { redactPII } = require('./tools/sanitize');
const { getSystemPrompt, getFaqKb } = require('./tools/kb_cache');
const { generateSlots, createEvent } = require('./flows/calendar');
const { appendLead } = require('./tools/leads');

const app = express();
app.use(helmet());
app.use(express.json({ limit: '200kb' }));

// Basic rate limiting to protect webhook and API
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

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
    version: process.env.APP_VERSION || '0.1.0',
  });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
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

app.post('/crisp/webhook', async (req, res) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const payload = req.body;
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
    
    // Detect intent
    const intentResult = intentDetector.detectIntent(message);
    console.log('[INTENT]', JSON.stringify(intentResult));
    
    // Generate response using LLM
    const response = await llm.generateResponse(message, history, intentResult, {
      systemPrompt: getSystemPrompt(),
      faq: getFaqKb(),
      demoMode: flags.DEMO_MODE,
    });
    
    // Add assistant response to history
    history.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });
    
    // Keep history manageable (last 20 messages)
    if (history.length > 20) {
      history.splice(0, history.length - 20);
    }
    
    if (flags.DRY_RUN) {
      console.log(`[CRISP][DRY] sendText conv=${conversationId}: ${response}`);
      console.log(`[CRISP][DRY] Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);
    }

    // Append lead on booking/pricing intents (demo-safe)
    if (intentResult.intent === 'booking' || intentResult.intent === 'pricing') {
      appendLead({ intent: intentResult.intent }, { dryRun: flags.DRY_RUN });
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

app.listen(flags.PORT, () => {
  console.log(
    `netia-bot-safe listening on port ${flags.PORT} (DRY_RUN=${flags.DRY_RUN}, KILL_SWITCH=${flags.KILL_SWITCH})`
  );
});

