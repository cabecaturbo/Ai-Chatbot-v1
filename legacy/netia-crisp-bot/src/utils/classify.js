const WORD = (s) => new RegExp(`(^|\b)${s}(\b|$)`, 'i');

const pricingKw = [/price|cost|pricing|how much|subscription|fee/i];
const featuresKw = [/feature|capabilit|do you do|what can/i];
const setupKw = [/setup|install|integrat|connect|onboard|go live|snippet/i];
const bookKw = [/book|schedule|demo|call|meeting|talk/i];
const humanKw = [/human|agent|person|representative|someone/i];
const supportKw = [/support|help|issue|problem|bug|down|broken|handoff/i];

export function classify({ text }) {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return 'other';
  if (pricingKw.some(r => r.test(t))) return 'pricing';
  if (featuresKw.some(r => r.test(t))) return 'features';
  if (setupKw.some(r => r.test(t))) return 'setup';
  if (bookKw.some(r => r.test(t))) return 'book_demo';
  if (humanKw.some(r => r.test(t))) return 'human';
  if (supportKw.some(r => r.test(t))) return 'support';
  return 'other';
}


