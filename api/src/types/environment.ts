// Environment variable types
export interface EnvironmentConfig {
  // Server Configuration
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';

  // Database
  DATABASE_URL: string;
  TEST_DATABASE_URL?: string;

  // Redis
  REDIS_URL: string;
  TEST_REDIS_URL?: string;

  // OpenAI
  OPENAI_API_KEY: string;
  OPENAI_MODEL: string;

  // Papercups Integration
  PAPERCUPS_URL: string;
  PAPERCUPS_API_KEY: string;
  PAPERCUPS_WEBHOOK_SECRET: string;

  // Security
  JWT_SECRET: string;
  CORS_ORIGIN: string;

  // Feature Flags
  DRY_RUN: boolean;
  KILL_SWITCH: boolean;
  DEMO_MODE: boolean;

  // Optional Features
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  EMAIL_FROM?: string;
  SENTRY_DSN?: string;
}

// Runtime flags
export interface RuntimeFlags {
  DRY_RUN: boolean;
  KILL_SWITCH: boolean;
  DEMO_MODE: boolean;
  PORT: number;
}

// Environment validation
export interface EnvValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
