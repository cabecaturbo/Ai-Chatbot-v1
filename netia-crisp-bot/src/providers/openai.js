import axios from 'axios';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import { readFileSync as fsRead } from 'fs';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

const systemPrompt = (() => {
  try {
    return readFileSync(join(process.cwd(), 'src', 'prompts', 'system.md'), 'utf8');
  } catch {
    return 'You are Netia.';
  }
})();

export class LLMError extends Error {
  constructor(message, code, cause) {
    super(message);
    this.code = code;
    if (cause) this.cause = cause;
  }
}

export async function askLLM({ userText, kb, intent }) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!apiKey) {
    throw new LLMError('Missing OPENAI_API_KEY', 'LLM_NO_KEY');
  }
  const kbSummary = (() => {
    try {
      const raw = readFileSync(join(process.cwd(), 'src', 'kb', 'netia.yml'), 'utf8');
      const obj = YAML.parse(raw) || {};
      const price = process.env.NETIA_DEFAULT_PRICE_USD || '89';
      const email = process.env.NETIA_SALES_EMAIL || 'sales@netia.ai';
      const booking = process.env.NETIA_BOOKING_URL || 'https://cal.com/netia/demo';
      const feat = Array.isArray(obj.features) ? obj.features.slice(0, 6).join('; ') : '';
      return `KB quick summary: price $${price}/mo; features: ${feat}; support: ${email}; booking: ${booking}.`;
    } catch {
      return '';
    }
  })();
  const messages = [
    { role: 'system', content: `${systemPrompt}\n\n${kbSummary}` },
    { role: 'user', content: userText }
  ];
  try {
    const res = await axios.post(OPENAI_URL, {
      model,
      messages,
      temperature: 0.5,
      max_tokens: 400
    }, {
      timeout: 15_000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    const text = res.data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Empty completion');
    return { text };
  } catch (e) {
    throw new LLMError('OpenAI request failed', 'LLM_REQUEST_FAILED', e);
  }
}


