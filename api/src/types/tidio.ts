// Tidio integration types
export interface TidioPayload {
  // Based on Tidio webhook structure
  event: string;
  data: {
    message?: {
      id: string;
      content: string;
      from: 'visitor' | 'operator';
      timestamp: number;
      conversation_id: string;
      visitor_id?: string;
      operator_id?: string;
    };
    conversation?: {
      id: string;
      visitor_id: string;
      status: string;
      created_at: number;
    };
    visitor?: {
      id: string;
      email?: string;
      name?: string;
      custom_fields?: Record<string, any>;
    };
  };
  timestamp: number;
  // Legacy fields for backward compatibility
  conversation_id?: string;
  message?: string;
  type?: string;
}

export interface TidioWebhookRequest {
  body: TidioPayload;
  headers: Record<string, string>;
  signature?: string;
}

export interface TidioSendParams {
  websiteId: string;
  conversationId: string;
  text: string;
}

export interface TidioResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Tidio webhook validation
export interface TidioWebhookSchema {
  type: 'object';
  properties: {
    conversation_id: { type: 'string'; minLength: number };
    message: { type: 'string'; minLength: number };
  };
  required: string[];
  additionalProperties: boolean;
}

// Tidio configuration (single account for all tenants)
export interface TidioConfig {
  client_id: string; // Tidio OpenAPI Client ID
  client_secret: string; // Tidio OpenAPI Client Secret
  webhook_secret: string;
}

// Tenant-specific Tidio configuration
export interface TenantTidioConfig {
  tenantId: string;
  websiteId: string; // Each tenant has their own website ID
  isActive: boolean;
}

// Tidio website creation for new tenants
export interface CreateTidioWebsiteParams {
  tenantId: string;
  tenantName: string;
  websiteUrl?: string;
}
