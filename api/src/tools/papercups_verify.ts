// Papercups webhook signature verification
import crypto from 'crypto';
import { Request } from 'express';

export function verifySignature(req: Request, secret?: string): boolean {
  if (!secret) {
    console.warn('[PAPERCUPS] No webhook secret configured');
    return false;
  }

  const signature = req.headers['x-papercups-signature'] as string;
  if (!signature) {
    console.warn('[PAPERCUPS] No signature header found');
    return false;
  }

  const rawBody = (req as any).rawBody;
  if (!rawBody) {
    console.warn('[PAPERCUPS] No raw body found for signature verification');
    return false;
  }

  try {
    // Papercups uses HMAC-SHA256 for webhook signatures
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex');

    // Papercups typically sends signature as: sha256=<hash>
    const receivedSignature = signature.replace('sha256=', '');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );

    if (!isValid) {
      console.warn('[PAPERCUPS] Invalid webhook signature');
    }

    return isValid;
  } catch (error) {
    console.error('[PAPERCUPS] Signature verification error:', error);
    return false;
  }
}

export function extractWebhookData(req: Request): any {
  try {
    const body = req.body;
    
    // Papercups webhook payload structure
    if (body && body.type && body.data) {
      return {
        type: body.type,
        data: body.data,
        account_id: body.account_id,
        timestamp: body.timestamp || Date.now()
      };
    }

    return null;
  } catch (error) {
    console.error('[PAPERCUPS] Error extracting webhook data:', error);
    return null;
  }
}
