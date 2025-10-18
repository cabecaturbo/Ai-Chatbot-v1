const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE_REGEX = /\+?[0-9][0-9\-().\s]{6,}/g;

function redactPII(text: string | undefined | null): string {
  if (!text) return text || '';
  return String(text)
    .replace(EMAIL_REGEX, '[redacted-email]')
    .replace(PHONE_REGEX, '[redacted-phone]');
}

export { redactPII };
