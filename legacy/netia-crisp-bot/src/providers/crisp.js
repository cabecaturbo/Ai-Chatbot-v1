import axios from 'axios';
import { z } from 'zod';

const CRISP_API_BASE = 'https://api.crisp.chat/v1';

const webhookSchema = z.object({
  event: z.string().optional(),
  website_id: z.string(),
  session_id: z.string(),
  data: z.object({
    text: z.string().optional(),
    from: z.string().optional(),
    type: z.string().optional()
  })
});

export function extractSession(reqBody) {
  const parsed = webhookSchema.safeParse(reqBody);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    const err = new Error(`Invalid Crisp webhook: ${issues}`);
    err.code = 'CRISP_WEBHOOK_INVALID';
    throw err;
  }
  const { session_id, data } = parsed.data;
  const isVisitor = (data.from || '').toLowerCase() === 'visitor';
  const messageText = data.type === 'text' ? (data.text || '') : '';
  return { sessionId: session_id, messageText, isVisitor };
}

export async function sendText({ websiteId, sessionId, text }) {
  if (!text || !text.trim()) return;
  const identifier = process.env.CRISP_TOKEN_IDENTIFIER;
  const key = process.env.CRISP_TOKEN_KEY;
  if (!identifier || !key) {
    const err = new Error('Missing Crisp credentials');
    err.code = 'CRISP_MISSING_CREDS';
    throw err;
  }
  const auth = Buffer.from(`${identifier}:${key}`).toString('base64');
  const url = `${CRISP_API_BASE}/website/${websiteId}/conversation/${sessionId}/message`;
  try {
    await axios.post(url, {
      type: 'text',
      from: 'operator',
      origin: 'chat',
      content: text
    }, {
      timeout: 15_000,
      headers: {
        Authorization: `Basic ${auth}`
      }
    });
  } catch (e) {
    const err = new Error('Failed to send message to Crisp');
    err.code = 'CRISP_SEND_FAILED';
    err.cause = e;
    throw err;
  }
}


