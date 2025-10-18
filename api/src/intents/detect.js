const BOOKING_KEYWORDS = [
  'book', 'booking', 'schedule', 'appointment', 'reserve'
];

const PRICING_KEYWORDS = [
  'price', 'pricing', 'cost', 'rate', 'plans'
];

const FAQ_KEYWORDS = [
  'hours', 'location', 'support', 'help', 'faq'
];

function classifyIntent(text) {
  const normalized = String(text || '').toLowerCase();
  if (BOOKING_KEYWORDS.some(k => normalized.includes(k))) return 'booking';
  if (PRICING_KEYWORDS.some(k => normalized.includes(k))) return 'pricing';
  if (FAQ_KEYWORDS.some(k => normalized.includes(k))) return 'faq';
  return 'general';
}

class IntentDetector {
  detectIntent(message) {
    const intent = classifyIntent(message);
    const confidence = intent === 'general' ? 0.4 : 0.8;
    const entities = {};
    const missing_slots = intent === 'booking' ? ['date', 'time'] : [];
    return { intent, confidence, entities, missing_slots };
  }
}

module.exports = { IntentDetector };


