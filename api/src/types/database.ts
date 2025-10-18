// Database entity types from docs/database.md
export interface Tenant {
  id: string;
  name: string;
  email: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  tidio_website_id: string | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

export interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  name: string;
  permissions: Record<string, any>;
  last_used_at: Date | null;
  created_at: Date;
  is_active: boolean;
}

export interface Conversation {
  id: string;
  tenant_id: string;
  session_id: string;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

export interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

// For conversation history (matches AI types)
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  intent: string;
  contact_info: Record<string, any>;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: Date;
  updated_at: Date;
}

export interface TenantConfiguration {
  id: string;
  tenant_id: string;
  config_type: string;
  config_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface KnowledgeBase {
  id: string;
  tenant_id: string;
  content_type: 'faq' | 'system_prompt' | 'custom';
  content: string;
  version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Database query result types
export interface DatabasePool {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount: number }>;
  end: () => Promise<void>;
}

// Database operation types
export interface SaveMessageParams {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SaveLeadParams {
  intent: string;
  tenantId?: string;
  conversationId?: string;
}

// Chat widget integration types
export interface TenantTidioConfig {
  tenantId: string;
  tidioWebsiteId: string;
  isActive: boolean;
}

export interface CreateTenantParams {
  name: string;
  email: string;
  subscriptionPlan: 'basic' | 'pro' | 'enterprise';
  tidioWebsiteId?: string;
}
