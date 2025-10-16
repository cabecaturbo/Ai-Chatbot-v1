const DEFAULT_PRICING = 'Our plans start at $29/mo. Need more details?';
const DEFAULT_BOOKING = 'I can help book an appointment. What date and time works for you?';
const DEFAULT_FAQ = 'You can find hours and location on our website. What else can I help with?';
const { PRICING: DEMO_PRICING, BOOKING: DEMO_BOOKING, FAQ: DEMO_FAQ } = require('../tools/demo_templates');
const DEFAULT_FALLBACK = 'Happy to help! Could you share a bit more about your request?';

class NetiaLLM {
  constructor(isDryRun) {
    this.isDryRun = Boolean(isDryRun);
  }

  async generateResponse(message, history, intentResult, context) {
    // In DRY_RUN, return deterministic template-based answers.
    if (this.isDryRun) {
      if (context && context.systemPrompt && context.faq && history && history.length === 1) {
        // Demo-friendly intro on first turn
        return 'Hi! I can help with pricing, booking, and FAQs.';
      }
      switch (intentResult.intent) {
        case 'pricing':
          return (context && context.demoMode) ? DEMO_PRICING : DEFAULT_PRICING;
        case 'booking':
          return (context && context.demoMode) ? DEMO_BOOKING : DEFAULT_BOOKING;
        case 'faq':
          return (context && context.demoMode) ? DEMO_FAQ : DEFAULT_FAQ;
        default:
          return DEFAULT_FALLBACK;
      }
    }

    // Live mode (placeholder): call your LLM provider here.
    // Keep a simple fallback to avoid runtime failure until implemented.
    return DEFAULT_FALLBACK;
  }
}

module.exports = { NetiaLLM };


