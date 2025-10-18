import { IntentResult } from '@/types/ai';

const BOOKING_KEYWORDS = [
  'book', 'booking', 'schedule', 'appointment', 'reserve'
];

const PRICING_KEYWORDS = [
  'price', 'pricing', 'cost', 'rate', 'plans'
];

const FAQ_KEYWORDS = [
  'hours', 'location', 'support', 'help', 'faq'
];

type IntentType = 'booking' | 'pricing' | 'faq' | 'general';

function classifyIntent(text: string): IntentType {
  const normalized = String(text || '').toLowerCase();
  if (BOOKING_KEYWORDS.some(k => normalized.includes(k))) return 'booking';
  if (PRICING_KEYWORDS.some(k => normalized.includes(k))) return 'pricing';
  if (FAQ_KEYWORDS.some(k => normalized.includes(k))) return 'faq';
  return 'general';
}

export class IntentDetector {
  detectIntent(message: string): IntentResult {
    const intent = classifyIntent(message);
    const confidence = intent === 'general' ? 0.4 : 0.8;
    const entities: any[] = [];
    const missing_slots = intent === 'booking' ? ['date', 'time'] : [];
    
    return { 
      intent, 
      confidence, 
      entities, 
      missing_slots 
    };
  }
}
