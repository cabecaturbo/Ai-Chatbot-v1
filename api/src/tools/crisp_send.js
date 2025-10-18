function getAuthHeader() {
  const id = process.env.CRISP_IDENTIFIER;
  const key = process.env.CRISP_KEY;
  if (!id || !key) throw new Error('CRISP credentials missing');
  const token = Buffer.from(`${id}:${key}`).toString('base64');
  return `Basic ${token}`;
}

async function sendText({ websiteId, conversationId, text, timeoutMs = 8000 }) {
  if (!websiteId) throw new Error('CRISP_WEBSITE_ID missing');
  if (!conversationId) throw new Error('conversationId required');
  const url = `https://api.crisp.chat/v1/website/${websiteId}/conversation/${conversationId}/message`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'text',
        from: 'operator',
        origin: 'chat',
        content: text,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Crisp send failed: ${res.status} ${body}`);
    }
    return true;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { sendText };


