// Basic guardrails to avoid handling sensitive data directly.

export function sanitizePublicText(input) {
  if (!input) return '';
  let text = String(input);
  // Strip potential PII beyond email/phone numbers
  // Keep simple email & phone; remove addresses and other patterns
  text = text.replace(/\b\d{1,5} [\w\s]+,? [A-Za-z]{2,} \d{3,6}\b/g, '[redacted address]');
  text = text.replace(/\b(?:ssn|social security|credit card|cc)[:\s]*\d+[\d\-\s]*\b/gi, '[redacted sensitive]');
  return text;
}

export function refusePaymentsOrPII() {
  return 'I can’t take payments or collect personal details here. For billing or sensitive info, please use our checkout or email support. Want me to book a quick call?';
}

export function humanHandoffText() {
  const email = process.env.NETIA_SALES_EMAIL || 'sales@netia.ai';
  const booking = process.env.NETIA_BOOKING_URL || 'https://cal.com/netia/demo';
  return `Happy to connect you with a person. You can email ${email} or book a quick call: ${booking}`;
}


