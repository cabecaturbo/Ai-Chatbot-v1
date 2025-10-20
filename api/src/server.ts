import express, { Request, Response, NextFunction } from 'express';
import 'dotenv/config';
import helmet from 'helmet';
import path from 'path';
import cors from 'cors';
import Ajv from 'ajv';
import { register, Counter, Histogram } from 'prom-client';
import { httpLogger } from './tools/logger';
import { buildRateLimiter } from './tools/redis_rate_limit';
import { ensureSchema, saveMessage, saveLead, getTenantConfiguration, getTenantByAccountId, getTenantById } from './tools/db';
import { authenticateApiKey } from './middleware/auth';
import { authenticateAccountToken, requireActiveSubscription } from './middleware/simplified_auth';
import { verifySignature, extractWebhookData } from './tools/papercups_verify';
import { sendText } from './tools/papercups_send';
import { generateWidgetCode, generateSimpleEmbedCode, generateReactWidgetCode } from './tools/widget_generator';
import { tenantOnboardingService } from './tools/tenant_onboarding';

// Import the new LLM and intent detection modules
import { NetiaLLM } from './llm/answer';
import { IntentDetector } from './intents/detect';
import { getSystemPrompt, getFaqKb } from './tools/kb_cache';
import { generateSlots, createEvent } from './flows/calendar';
import { appendLead } from './tools/leads';

// Import types
import { 
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
  const isApiPath = ['/health', '/metrics', '/papercups/webhook', '/calendar/', '/chat']
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
      "script-src": ["'self'"],
      "connect-src": ["'self'"],
      "img-src": ["'self'", "data:"],
      "frame-src": ["'self'"],
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

// Capture raw body for HMAC verification (e.g., Papercups webhooks)
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
    html = html.replace('__PAPERCUPS_ACCOUNT_ID__', String(process.env['PAPERCUPS_ACCOUNT_ID'] || ''));
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
const ajv = new Ajv({ allErrors: true, removeAdditional: 'failing' });
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

// Papercups webhook endpoint
app.post('/papercups/webhook', async (req: Request, res: Response) => {
  if (flags.KILL_SWITCH) {
    console.log('[KILL_SWITCH] Request ignored. Returning 200.');
    return res.status(200).json({ ok: true, skipped: true });
  }

  const secret = process.env['PAPERCUPS_WEBHOOK_SECRET'];
  if (!verifySignature(req, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = extractWebhookData(req);
  if (!payload) {
    return res.status(400).json({ error: 'Invalid payload', details: 'Unsupported Papercups webhook format' });
  }

  const safeLog = JSON.stringify({
    type: payload.type,
    account_id: payload.account_id,
    conversation_id: payload.data?.conversation_id,
    message: payload.data?.body ? payload.data.body.substring(0, 100) + '...' : 'No message',
  });
  console.log('[PAPERCUPS WEBHOOK] payload', safeLog);

  try {
    // Handle webhook verification
    if (payload.type === 'webhook:verify') {
      console.log('[PAPERCUPS WEBHOOK] Verification request received');
      return res.status(200).json({ payload: payload.payload || 'verified' });
    }

    // Only process message events
    if (payload.type !== 'message:created' || !payload.data) {
      return res.status(200).json({ ok: true, message: 'Event type not processed' });
    }

    // Identify tenant by account ID
    const tenant = await getTenantByAccountId(payload.account_id);
    if (!tenant) {
      console.error(`[PAPERCUPS WEBHOOK] No tenant found for account ID: ${payload.account_id}`);
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    const message = String(payload.data.body || '');
    const conversationId = String(payload.data.conversation_id || '');

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

    if (flags.DRY_RUN) {
      console.log(`[PAPERCUPS][DRY] sendText conv=${conversationId}: ${response}`);
      console.log(`[PAPERCUPS][DRY] Intent: ${intentResult.intent}, Confidence: ${intentResult.confidence}`);
    } else {
      // Live send to Papercups
      try {
        await sendText({ 
          accountId: payload.account_id, 
          conversationId, 
          text: response,
          userId: payload.data.user_id
        });
      } catch (error) {
        console.error('Papercups send error:', error);
      }
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
    console.error('[PAPERCUPS ERROR]', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Tenant management endpoints
app.get('/api/v1/tenant/info', authenticateApiKey, async (req: Request, res: Response) => {
  try {
    const tenant = req.tenant!;
    const tenantInfo = {
      id: tenant.id,
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
    const config = await getTenantConfiguration(tenant.id, configType);
    
    return res.json({ ok: true, configType, config });
  } catch (error) {
    console.error('Error getting tenant config:', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Widget code generation endpoints
app.get('/api/v1/tenant/widget-code', authenticateAccountToken, requireActiveSubscription, async (req: Request, res: Response) => {
  try {
    const tenant = req.simplifiedTenant!;
    const { format = 'html', customizations } = req.query;
    
    // Get tenant details from database
    const tenantDetails = await getTenantById(tenant.id);
    if (!tenantDetails) {
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    if (!tenantDetails.papercups_account_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Tenant does not have a Papercups account configured' 
      });
    }

    const options = {
      tenant: tenantDetails,
      customizations: customizations ? JSON.parse(customizations as string) : undefined
    };

    let widgetCode: string;
    switch (format) {
      case 'simple':
        widgetCode = generateSimpleEmbedCode(options);
        break;
      case 'react':
        widgetCode = generateReactWidgetCode(options);
        break;
      case 'html':
      default:
        widgetCode = generateWidgetCode(options);
        break;
    }

    return res.json({ 
      ok: true, 
      widgetCode,
      format,
      tenant: {
        id: tenantDetails.id,
        name: tenantDetails.name,
        papercups_account_id: tenantDetails.papercups_account_id
      }
    });
  } catch (error) {
    console.error('Error generating widget code:', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

app.get('/api/v1/tenant/widget-code/raw', authenticateAccountToken, requireActiveSubscription, async (req: Request, res: Response) => {
  try {
    const tenant = req.simplifiedTenant!;
    const { format = 'html', customizations } = req.query;
    
    // Get tenant details from database
    const tenantDetails = await getTenantById(tenant.id);
    if (!tenantDetails) {
      return res.status(404).json({ ok: false, error: 'Tenant not found' });
    }

    if (!tenantDetails.papercups_account_id) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Tenant does not have a Papercups account configured' 
      });
    }

    const options = {
      tenant: tenantDetails,
      customizations: customizations ? JSON.parse(customizations as string) : undefined
    };

    let widgetCode: string;
    switch (format) {
      case 'simple':
        widgetCode = generateSimpleEmbedCode(options);
        break;
      case 'react':
        widgetCode = generateReactWidgetCode(options);
        break;
      case 'html':
      default:
        widgetCode = generateWidgetCode(options);
        break;
    }

    // Return raw widget code as plain text
    res.set('Content-Type', 'text/plain');
    return res.send(widgetCode);
  } catch (error) {
    console.error('Error generating widget code:', error);
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
});

// Tenant Management Endpoints
app.post('/api/v1/tenants/onboard', async (req: Request, res: Response) => {
  try {
    const { name, email, companyName, subscriptionPlan } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name and email are required' 
      });
    }

    const result = await tenantOnboardingService.onboardTenant({
      name,
      email,
      companyName,
      subscriptionPlan
    });

    return res.status(201).json({
      ok: true,
      data: result,
      message: 'Tenant onboarded successfully'
    });

  } catch (error) {
    console.error('Error onboarding tenant:', error);
    return res.status(500).json({ 
      ok: false, 
      error: (error as Error).message 
    });
  }
});

app.get('/api/v1/tenant/info', authenticateAccountToken, async (req: Request, res: Response) => {
  try {
    const tenant = req.simplifiedTenant!;
    const tenantInfo = await tenantOnboardingService.getTenantInfo(tenant.id);
    
    if (!tenantInfo) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Tenant not found' 
      });
    }

    return res.json({
      ok: true,
      data: tenantInfo
    });

  } catch (error) {
    console.error('Error getting tenant info:', error);
    return res.status(500).json({ 
      ok: false, 
      error: (error as Error).message 
    });
  }
});

app.put('/api/v1/tenant/subscription', authenticateAccountToken, async (req: Request, res: Response) => {
  try {
    const tenant = req.simplifiedTenant!;
    const { subscriptionPlan, subscriptionStatus } = req.body;
    
    if (!subscriptionPlan || !subscriptionStatus) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'subscriptionPlan and subscriptionStatus are required' 
      });
    }

    const success = await tenantOnboardingService.updateTenantSubscription(
      tenant.id,
      subscriptionPlan,
      subscriptionStatus
    );

    if (!success) {
      return res.status(500).json({ 
        ok: false, 
        error: 'Failed to update subscription' 
      });
    }

    return res.json({
      ok: true,
      message: 'Subscription updated successfully'
    });

  } catch (error) {
    console.error('Error updating subscription:', error);
    return res.status(500).json({ 
      ok: false, 
      error: (error as Error).message 
    });
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
