// AI and LLM related types
export interface IntentResult {
  intent: string;
  confidence: number;
  entities: any[];
  missing_slots: string[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface ConversationHistory {
  messages: Message[];
  context?: Record<string, any>;
}

export interface LLMContext {
  systemPrompt?: string;
  faq?: string;
  demoMode?: boolean;
  tenantId?: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

// Intent detection types
export interface IntentPattern {
  intent: string;
  patterns: string[];
  confidence_threshold: number;
  entities?: string[];
}

export interface IntentConfig {
  intents: IntentPattern[];
  fallback_intent: string;
  default_confidence: number;
}

// Knowledge base types
export interface FAQItem {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
}

export interface SystemPrompt {
  content: string;
  version: number;
  updated_at: string;
}

// AI service configuration
export interface AIConfig {
  openai_api_key: string;
  openai_model: string;
  max_tokens: number;
  temperature: number;
  timeout: number;
}
