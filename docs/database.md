# Database Schema - Single Source of Truth

This document contains the complete database schema for the Netia AI Chatbot multi-tenant SaaS platform. All schema changes should be documented here first, then implemented in the database.

## Current Schema (Production)

### Core Tables

#### `tenants`
Stores customer account information and subscription details.

```sql
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    crisp_website_id VARCHAR(255) UNIQUE,
    tidio_website_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_tenants_email ON tenants(email);
CREATE INDEX idx_tenants_status ON tenants(subscription_status);
CREATE INDEX idx_tenants_crisp_website_id ON tenants(crisp_website_id);
CREATE INDEX idx_tenants_tidio_website_id ON tenants(tidio_website_id);
```

#### `api_keys`
Stores API keys for tenant authentication.

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    permissions JSONB DEFAULT '{}',
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

### Tenant-Specific Data Tables

#### `conversations`
Stores conversation sessions per tenant.

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE UNIQUE INDEX idx_conversations_tenant_session ON conversations(tenant_id, session_id);
```

#### `messages`
Stores individual messages within conversations.

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_messages_tenant_id ON messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

#### `leads`
Stores captured leads from conversations.

```sql
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    intent VARCHAR(50) NOT NULL,
    contact_info JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_intent ON leads(intent);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at);
```

### Configuration Tables

#### `tenant_configurations`
Stores tenant-specific configuration settings.

```sql
CREATE TABLE tenant_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    config_type VARCHAR(100) NOT NULL,
    config_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tenant_configs_tenant_id ON tenant_configurations(tenant_id);
CREATE INDEX idx_tenant_configs_type ON tenant_configurations(config_type);
CREATE UNIQUE INDEX idx_tenant_configs_tenant_type ON tenant_configurations(tenant_id, config_type);
```

#### `knowledge_bases`
Stores tenant-specific knowledge base content.

```sql
CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('faq', 'system_prompt', 'custom')),
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_tenant_id ON knowledge_bases(tenant_id);
CREATE INDEX idx_kb_content_type ON knowledge_bases(content_type);
CREATE INDEX idx_kb_active ON knowledge_bases(is_active);
```

## Schema Evolution History

### Version 1.2 (Tidio Integration Support)
- Added `tidio_website_id` to `tenants` table for Tidio chat widget support
- Added index on `tidio_website_id` for efficient lookups
- **Dual Chat Platform Support**: System now supports both Crisp and Tidio chat widgets
- **Tidio Webhook Flow**: Uses conversation data for tenant identification (different from Crisp's website_id approach)
- **Environment Configuration**: Updated to support both chat platforms with separate API credentials

### Version 1.1 (Crisp Integration Update)
- Added `crisp_website_id` to `tenants` table for single Crisp account multi-tenant support
- Added index on `crisp_website_id` for efficient lookups
- Updated tenant onboarding to include Crisp website creation
- **Webhook Flow**: System now uses `website_id` from Crisp webhook payload to identify tenants
- **Removed API Key Dependency**: Webhook no longer requires hardcoded API keys in headers

### Version 1.0 (Initial Multi-Tenant Schema)
- Added `tenants` table for customer accounts
- Added `api_keys` table for authentication
- Added `tenant_id` to all existing tables
- Created tenant-specific data isolation

### Version 0.9 (Pre-Multi-Tenant)
- Basic `conversations`, `messages`, and `leads` tables
- Single-tenant architecture
- No tenant isolation

## TypeScript Type Definitions

```typescript
// Database entity types
interface Tenant {
  id: string;
  name: string;
  email: string;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_plan: 'basic' | 'pro' | 'enterprise';
  crisp_website_id: string | null;
  tidio_website_id: string | null;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
}

interface ApiKey {
  id: string;
  tenant_id: string;
  key_hash: string;
  name: string;
  permissions: Record<string, any>;
  last_used_at: Date | null;
  created_at: Date;
  is_active: boolean;
}

interface Conversation {
  id: string;
  tenant_id: string;
  session_id: string;
  created_at: Date;
  updated_at: Date;
  metadata: Record<string, any>;
}

interface Message {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

interface Lead {
  id: string;
  tenant_id: string;
  conversation_id: string | null;
  intent: string;
  contact_info: Record<string, any>;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  created_at: Date;
  updated_at: Date;
}

interface TenantConfiguration {
  id: string;
  tenant_id: string;
  config_type: string;
  config_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

interface KnowledgeBase {
  id: string;
  tenant_id: string;
  content_type: 'faq' | 'system_prompt' | 'custom';
  content: string;
  version: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

## Database Connection and Setup

### Environment Variables
```bash
# Neon Database (Production)
DATABASE_URL=postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Local Development
DATABASE_URL=postgresql://username:password@localhost:5432/netia_chatbot

# Test Database
TEST_DATABASE_URL=postgresql://username:password@localhost:5432/netia_chatbot_test
```

### Connection Pool Configuration
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});
```

## Security Considerations

### Row-Level Security (RLS)
All tenant-specific tables should implement RLS policies:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

-- Create policies (example for conversations)
CREATE POLICY tenant_isolation ON conversations
  FOR ALL TO application_role
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Data Isolation Rules
1. **Always include `tenant_id` in WHERE clauses**
2. **Use parameterized queries to prevent SQL injection**
3. **Validate tenant access before any data operations**
4. **Log all database access with tenant context**

## Performance Optimization

### Indexes
- All `tenant_id` columns are indexed for fast tenant isolation
- Composite indexes on frequently queried combinations
- Timestamp indexes for time-based queries

### Query Patterns
- Always filter by `tenant_id` first
- Use LIMIT for pagination
- Implement proper connection pooling
- Use prepared statements for repeated queries

## Backup and Recovery

### Backup Strategy
- Daily automated backups via Neon
- Point-in-time recovery available
- Cross-region backup replication

### Recovery Procedures
1. Document all recovery procedures
2. Test backup restoration regularly
3. Maintain disaster recovery plan
4. Monitor backup success/failure

---

**Last Updated**: [Current Date]
**Schema Version**: 1.0
**Next Planned Changes**: [Document future schema changes here]
