const crypto = require('crypto');

function verifySignature(req, secret) {
  if (!secret) return true; // skip if not configured
  const sig = req.headers['x-crisp-signature'];
  if (!sig) return false;
  const body = JSON.stringify(req.body || {});
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
}

module.exports = { verifySignature };


