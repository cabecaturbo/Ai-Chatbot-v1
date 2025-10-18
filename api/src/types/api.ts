// API request/response types
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ChatRequest {
  session_id: string;
  message: string;
  tenant_id?: string;
}

export interface ChatResponse {
  ok: boolean;
  intent: string;
  confidence: number;
  entities: any[];
  missing_slots: string[];
  response: string;
  error?: string;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  database: 'connected' | 'disconnected';
  redis: 'connected' | 'disconnected';
}

export interface MetricsResponse {
  http_requests_total: number;
  llm_requests_total: number;
  llm_request_duration_seconds: number;
  crisp_send_total: number;
  active_conversations: number;
}

// Middleware types
export interface TenantContext {
  tenantId: string;
  apiKey: string;
  permissions: Record<string, any>;
}

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}
