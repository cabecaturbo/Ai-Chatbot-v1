import crypto from 'crypto';
import { Request } from 'express';

function verifySignature(req: Request, secret: string | undefined): boolean {
  if (!secret) return true; // skip if not configured
  
  // Tidio typically uses different header names for webhook signatures
  // This will need to be updated based on actual Tidio documentation
  const sig = req.headers['x-tidio-signature'] as string;
  if (!sig) return false;
  
  const raw = typeof (req as any).rawBody === 'string' 
    ? (req as any).rawBody 
    : JSON.stringify(req.body || {});
  
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(hmac));
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export { verifySignature };
