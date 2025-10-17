import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';

function loadKB() {
  const fp = join(process.cwd(), 'src', 'kb', 'netia.yml');
  const raw = readFileSync(fp, 'utf8');
  return YAML.parse(raw);
}

export function getKB() {
  try {
    return loadKB();
  } catch {
    return {};
  }
}

function price() {
  return Number(process.env.NETIA_DEFAULT_PRICE_USD || '89');
}

export function fallbackFromKB({ intent }) {
  const booking = process.env.NETIA_BOOKING_URL || 'https://cal.com/netia/demo';
  const email = process.env.NETIA_SALES_EMAIL || 'sales@netia.ai';
  const p = price();
  switch (intent) {
    case 'pricing':
      return `Netia starts at $${p}/mo. Includes the chat widget, AI replies, lead capture, and booking. Want a quick call to confirm fit? ${booking}`;
    case 'features':
      return `Netia includes AI receptionist, lead capture, auto-reply, appointment booking, website chat, and email summaries. Want me to book a quick call? ${booking}`;
    case 'setup':
      return `Setup takes under 30 minutes: add the Crisp snippet, connect keys, and go live. If you like, I can book a quick call: ${booking}`;
    case 'book_demo':
      return `Sure—grab a time here: ${booking}`;
    case 'human':
      return `Happy to connect you with a person. Email ${email} or book a quick call: ${booking}`;
    case 'support':
      return `Our team is here to help. For faster help, email ${email}. Want me to book a quick call? ${booking}`;
    default:
      return `I’ll do my best to help. Want me to book a quick call? ${booking}`;
  }
}

export function mergeAnswer({ llmText, intent }) {
  // Optionally add a single helpful link based on intent
  const booking = process.env.NETIA_BOOKING_URL || 'https://cal.com/netia/demo';
  const email = process.env.NETIA_SALES_EMAIL || 'sales@netia.ai';
  if (!llmText) return fallbackFromKB({ intent });
  if (intent === 'book_demo') return `${llmText}\n\nBook: ${booking}`;
  if (intent === 'support' || intent === 'human') return `${llmText}\n\nEmail: ${email}`;
  if (intent === 'pricing' || intent === 'setup' || intent === 'features') return `${llmText}\n\nWant a quick call? ${booking}`;
  return llmText;
}


