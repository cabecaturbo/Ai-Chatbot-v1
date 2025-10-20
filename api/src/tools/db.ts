import { Pool } from 'pg';
import { DatabasePool } from '../types/database';

const connectionString = process.env['DATABASE_URL'];
let pool: Pool | null = null;

function getPool(): DatabasePool | null {
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ 
      connectionString, 
      ssl: getSsl() 
    });
  }
  return pool;
}

function getSsl(): boolean | { rejectUnauthorized: boolean } {
  if (process.env['PGSSL'] === 'false') return false;
  return { rejectUnauthorized: false };
}

async function ensureSchema(): Promise<void> {
  const p = getPool();
  if (!p) return;
  
  // Create tenants table
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscription_status VARCHAR(50) DEFAULT 'trial',
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        papercups_account_id VARCHAR(255) UNIQUE NOT NULL,
        papercups_inbox_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
    );
    
    CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
    CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(subscription_status);
    CREATE INDEX IF NOT EXISTS idx_tenants_papercups_account_id ON tenants(papercups_account_id);
  `);

  // Add papercups_inbox_id column if it doesn't exist (for existing databases)
  await p.query(`
    ALTER TABLE tenants 
    ADD COLUMN IF NOT EXISTS papercups_inbox_id VARCHAR(255);
  `);

  // Make papercups_account_id NOT NULL if it's not already (for existing databases)
  await p.query(`
    ALTER TABLE tenants 
    ALTER COLUMN papercups_account_id SET NOT NULL;
  `);

  // Create api_keys table
  await p.query(`
    CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        key_hash VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        permissions JSONB DEFAULT '{}',
        last_used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
    );
    
    CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_id ON api_keys(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
  `);

  // Create conversations table (updated with tenant_id)
  await p.query(`
    CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        session_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_conversations_tenant_id ON conversations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
  `);

  // Create messages table (updated with tenant_id)
  await p.query(`
    CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_tenant_id ON messages(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
  `);

  // Create leads table (updated with tenant_id)
  await p.query(`
    CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
        intent VARCHAR(100) NOT NULL,
        contact_info JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_leads_tenant_id ON leads(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_leads_intent ON leads(intent);
    CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
  `);

  // Create tenant_configurations table
  await p.query(`
    CREATE TABLE IF NOT EXISTS tenant_configurations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        config_type VARCHAR(100) NOT NULL,
        config_data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_id ON tenant_configurations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_tenant_configs_type ON tenant_configurations(config_type);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_configs_tenant_type ON tenant_configurations(tenant_id, config_type);
  `);

  // Create knowledge_bases table
  await p.query(`
    CREATE TABLE IF NOT EXISTS knowledge_bases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
    );
    
    CREATE INDEX IF NOT EXISTS idx_knowledge_bases_tenant_id ON knowledge_bases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_knowledge_bases_active ON knowledge_bases(is_active);
  `);
}

async function saveMessage(
  tenantId: string,
  conversationId: string, 
  role: 'user' | 'assistant' | 'system', 
  content: string
): Promise<void> {
  const p = getPool();
  if (!p) return;
  
  // Create conversation if it doesn't exist
  await p.query(`
    INSERT INTO conversations(id, tenant_id, session_id) 
    VALUES($1, $2, $3) 
    ON CONFLICT (id) DO NOTHING
  `, [conversationId, tenantId, conversationId]);
  
  // Insert message
  await p.query(`
    INSERT INTO messages(tenant_id, conversation_id, role, content) 
    VALUES($1, $2, $3, $4)
  `, [tenantId, conversationId, role, content]);
}

async function saveLead(
  tenantId: string,
  intent: string,
  conversationId?: string,
  contactInfo?: Record<string, any>
): Promise<void> {
  const p = getPool();
  if (!p) return;
  
  await p.query(`
    INSERT INTO leads(tenant_id, conversation_id, intent, contact_info) 
    VALUES($1, $2, $3, $4)
  `, [tenantId, conversationId || null, intent, contactInfo ? JSON.stringify(contactInfo) : null]);
}

// Tenant management functions
async function createTenant(
  name: string,
  email: string,
  subscriptionPlan: string = 'basic',
  papercupsAccountId: string,
  papercupsInboxId?: string
): Promise<string> {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  
  if (!papercupsAccountId) {
    throw new Error('Papercups account ID is required');
  }
  
  const result = await p.query(`
    INSERT INTO tenants(name, email, subscription_plan, papercups_account_id, papercups_inbox_id)
    VALUES($1, $2, $3, $4, $5)
    RETURNING id
  `, [name, email, subscriptionPlan, papercupsAccountId, papercupsInboxId]);
  
  return result.rows[0].id;
}

async function getTenantById(tenantId: string): Promise<any> {
  const p = getPool();
  if (!p) return null;
  
  const result = await p.query(`
    SELECT * FROM tenants WHERE id = $1 AND is_active = true
  `, [tenantId]);
  
  return result.rows[0] || null;
}

async function getTenantByAccountId(accountId: string): Promise<any> {
  const p = getPool();
  if (!p) return null;
  
  const result = await p.query(`
    SELECT * FROM tenants WHERE papercups_account_id = $1 AND is_active = true
  `, [accountId]);
  
  return result.rows[0] || null;
}

async function getTenantByEmail(email: string): Promise<any> {
  const p = getPool();
  if (!p) return null;
  
  const result = await p.query(`
    SELECT * FROM tenants WHERE email = $1 AND is_active = true
  `, [email]);
  
  return result.rows[0] || null;
}

// API key management functions
async function createApiKey(
  tenantId: string,
  keyHash: string,
  name: string,
  permissions: string[] = []
): Promise<string> {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  
  const result = await p.query(`
    INSERT INTO api_keys(tenant_id, key_hash, name, permissions)
    VALUES($1, $2, $3, $4)
    RETURNING id
  `, [tenantId, keyHash, name, JSON.stringify(permissions)]);
  
  return result.rows[0].id;
}

async function getApiKeyByHash(keyHash: string): Promise<any> {
  const p = getPool();
  if (!p) return null;
  
  const result = await p.query(`
    SELECT ak.*, t.name as tenant_name, t.subscription_status, t.subscription_plan
    FROM api_keys ak
    JOIN tenants t ON ak.tenant_id = t.id
    WHERE ak.key_hash = $1 AND ak.is_active = true AND t.is_active = true
  `, [keyHash]);
  
  return result.rows[0] || null;
}

async function updateApiKeyLastUsed(keyId: string): Promise<void> {
  const p = getPool();
  if (!p) return;
  
  await p.query(`
    UPDATE api_keys 
    SET last_used_at = NOW() 
    WHERE id = $1
  `, [keyId]);
}

// Tenant configuration functions
async function getTenantConfiguration(
  tenantId: string,
  configType: string
): Promise<any> {
  const p = getPool();
  if (!p) return null;
  
  const result = await p.query(`
    SELECT config_data FROM tenant_configurations
    WHERE tenant_id = $1 AND config_type = $2
  `, [tenantId, configType]);
  
  return result.rows[0]?.config_data || null;
}

async function setTenantConfiguration(
  tenantId: string,
  configType: string,
  configData: Record<string, any>
): Promise<void> {
  const p = getPool();
  if (!p) throw new Error('Database not available');
  
  await p.query(`
    INSERT INTO tenant_configurations(tenant_id, config_type, config_data)
    VALUES($1, $2, $3)
    ON CONFLICT (tenant_id, config_type)
    DO UPDATE SET config_data = $3, updated_at = NOW()
  `, [tenantId, configType, JSON.stringify(configData)]);
}

export { 
  getPool, 
  ensureSchema, 
  saveMessage, 
  saveLead,
  createTenant,
  getTenantById,
  getTenantByAccountId,
  getTenantByEmail,
  createApiKey,
  getApiKeyByHash,
  updateApiKeyLastUsed,
  getTenantConfiguration,
  setTenantConfiguration
};
