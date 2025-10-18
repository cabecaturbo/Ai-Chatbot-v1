import { IntentResult, Message, LLMContext } from '@/types/ai';
import { DEMO_TEMPLATES } from '@/tools/demo_templates';

const DEFAULT_PRICING = 'Our plans start at $29/mo. Need more details?';
const DEFAULT_BOOKING = 'I can help book an appointment. What date and time works for you?';
const DEFAULT_FAQ = 'You can find hours and location on our website. What else can I help with?';
const DEFAULT_FALLBACK = 'Happy to help! Could you share a bit more about your request?';

interface OpenAIClient {
  generate(params: {
    messages: Array<{ role: string; content: string }>;
  }): Promise<string>;
}

export class NetiaLLM {
  private isDryRun: boolean;
  private live: OpenAIClient;

  constructor(isDryRun: boolean) {
    this.isDryRun = Boolean(isDryRun);
    this.live = require('./openai_client');
  }

  async generateResponse(
    message: string, 
    history: Message[], 
    intentResult: IntentResult, 
    context?: LLMContext
  ): Promise<string> {
    // In DRY_RUN, return deterministic template-based answers.
    if (this.isDryRun) {
      if (context?.systemPrompt && context?.faq && history && history.length === 1) {
        // Demo-friendly intro on first turn
        return 'Hi! I can help with pricing, booking, and FAQs.';
      }
      
      switch (intentResult.intent) {
        case 'pricing':
          return (context?.demoMode) ? DEMO_TEMPLATES.PRICING : DEFAULT_PRICING;
        case 'booking':
          return (context?.demoMode) ? DEMO_TEMPLATES.BOOKING : DEFAULT_BOOKING;
        case 'faq':
          return (context?.demoMode) ? DEMO_TEMPLATES.FAQ : DEFAULT_FAQ;
        default:
          return DEFAULT_FALLBACK;
      }
    }

    // Live mode
    try {
      const content = await this.live.generate({
        messages: [
          { role: 'system', content: context?.systemPrompt || '' },
          ...history,
          { role: 'user', content: message },
        ],
      });
      return content || DEFAULT_FALLBACK;
    } catch (error) {
      console.error('LLM generation error:', error);
      return DEFAULT_FALLBACK;
    }
  }
}
