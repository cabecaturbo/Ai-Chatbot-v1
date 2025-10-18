// Types are defined locally to avoid import issues

function getAuthHeaders(): Record<string, string> {
  const clientId = process.env['TIDIO_CLIENT_ID'];
  const clientSecret = process.env['TIDIO_CLIENT_SECRET'];
  if (!clientId || !clientSecret) throw new Error('TIDIO_CLIENT_ID and TIDIO_CLIENT_SECRET required');
  
  return {
    'X-Tidio-Openapi-Client-Id': clientId,
    'X-Tidio-Openapi-Client-Secret': clientSecret
  };
}

interface SendTextParams {
  websiteId: string;
  conversationId: string;
  text: string;
  timeoutMs?: number;
}

async function sendText({ 
  websiteId, 
  conversationId, 
  text, 
  timeoutMs = 8000 
}: SendTextParams): Promise<boolean> {
  if (!conversationId) throw new Error('conversationId required');
  
  // Tidio OpenAPI endpoint for sending messages
  // Based on Tidio's OpenAPI documentation structure
  const url = `https://api.tidio.com/v1/conversations/${conversationId}/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const authHeaders = getAuthHeaders();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: text,
        type: 'text',
        from: 'operator'
      }),
      signal: controller.signal,
    });
    
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Tidio send failed: ${res.status} ${body}`);
    }
    
    return true;
  } finally {
    clearTimeout(timer);
  }
}

export { sendText };
