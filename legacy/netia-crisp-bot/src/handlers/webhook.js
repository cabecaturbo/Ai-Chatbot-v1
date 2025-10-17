import { z } from 'zod';
import { extractSession, sendText } from '../providers/crisp.js';
import { classify } from '../utils/classify.js';
import { getKB, fallbackFromKB, mergeAnswer } from '../utils/render.js';
import { askLLM, LLMError } from '../providers/openai.js';

const rateMap = new Map(); // sessionId -> { count, ts }

const crispWebsiteId = process.env.CRISP_WEBSITE_ID || '';

function rateLimited(sessionId) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 8;
  const entry = rateMap.get(sessionId);
  if (!entry || now - entry.ts > windowMs) {
    rateMap.set(sessionId, { count: 1, ts: now });
    return false;
  }
  if (entry.count >= max) return true;
  entry.count += 1;
  return false;
}

export async function webhookHandler(req, res) {
  // Validate and extract
  let sessionId, messageText, isVisitor;
  try {
    const data = extractSession(req.body);
    sessionId = data.sessionId;
    messageText = data.messageText;
    isVisitor = data.isVisitor;
  } catch (e) {
    req.log?.warn({ err: e }, 'Invalid webhook payload');
    return res.status(400).json({ ok: false, error: 'invalid webhook' });
  }

  if (!isVisitor) return res.status(204).end();

  // Ignore non-text messages
  if (!messageText || !messageText.trim()) return res.status(204).end();

  if (rateLimited(sessionId)) {
    req.log?.info({ sessionId }, 'Rate limited');
    return res.status(204).end();
  }

  // Basic IP-based limiter (best effort, separate from session limiter)
  const ip = req.ip || req.headers['x-forwarded-for'] || req.connection?.remoteAddress;
  if (ip) {
    const key = `ip:${String(ip)}`;
    if (rateLimited(key)) {
      req.log?.info({ ip }, 'IP rate limited');
      return res.status(204).end();
    }
  }

  const intent = classify({ text: messageText });
  const kb = getKB();

  let answerText;
  try {
    const { text } = await askLLM({ userText: messageText, kb, intent });
    answerText = mergeAnswer({ llmText: text, intent });
  } catch (e) {
    req.log?.error({ err: e?.code || e?.message }, 'LLM failed, using fallback');
    answerText = fallbackFromKB({ messageText, kb, intent });
  }

  try {
    await sendText({ websiteId: crispWebsiteId, sessionId, text: answerText });
  } catch (e) {
    req.log?.error({ err: e?.code || e?.message }, 'Crisp send failed');
  }

  return res.status(200).json({ ok: true });
}


