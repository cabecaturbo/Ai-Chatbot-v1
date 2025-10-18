const crypto = require('crypto');

function verifySignature(req, secret) {
  if (!secret) return true; // skip if not configured
  const sig = req.headers['x-crisp-signature'];
  if (!sig) return false;
  const raw = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body || {});
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch (_) {
    return false;
  }
}

module.exports = { verifySignature };


