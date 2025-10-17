const OpenAI = require('openai');

function createOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

async function generate({ prompt, messages, timeoutMs = 12000 }) {
  const client = createOpenAI();
  if (!client) throw new Error('OPENAI_API_KEY missing');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages || [{ role: 'user', content: prompt }],
      temperature: 0.3,
    }, { signal: controller.signal });
    return resp.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { generate };


