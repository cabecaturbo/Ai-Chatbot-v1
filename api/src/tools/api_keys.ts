import crypto from 'crypto';
import { getApiKeyByHash, updateApiKeyLastUsed, createApiKey } from './db';

// API Key generation and validation utilities

interface ApiKeyInfo {
  id: string;
  tenantId: string;
  tenantName: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  name: string;
  permissions: string[];
  lastUsedAt: string | null;
  createdAt: string;
  isActive: boolean;
}

function generateApiKey(): string {
  const prefix = process.env['API_KEY_PREFIX'] || 'nt_';
  const length = parseInt(process.env['API_KEY_LENGTH'] || '32');
  const randomBytes = crypto.randomBytes(length).toString('hex');
  return `${prefix}${randomBytes}`;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

async function createNewApiKey(
  tenantId: string,
  name: string,
  permissions: string[] = ['chat', 'webhook']
): Promise<{ apiKey: string; keyId: string }> {
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  
  const keyId = await createApiKey(tenantId, keyHash, name, permissions);
  
  return { apiKey, keyId };
}

async function validateApiKey(apiKey: string): Promise<ApiKeyInfo | null> {
  if (!apiKey) return null;
  
  const keyHash = hashApiKey(apiKey);
  const keyInfo = await getApiKeyByHash(keyHash);
  
  if (!keyInfo) return null;
  
  // Update last used timestamp
  await updateApiKeyLastUsed(keyInfo.id);
  
  return {
    id: keyInfo.id,
    tenantId: keyInfo.tenant_id,
    tenantName: keyInfo.tenant_name,
    subscriptionStatus: keyInfo.subscription_status,
    subscriptionPlan: keyInfo.subscription_plan,
    name: keyInfo.name,
    permissions: JSON.parse(keyInfo.permissions || '[]'),
    lastUsedAt: keyInfo.last_used_at,
    createdAt: keyInfo.created_at,
    isActive: keyInfo.is_active
  };
}

function hasPermission(keyInfo: ApiKeyInfo, permission: string): boolean {
  return keyInfo.permissions.includes(permission) || keyInfo.permissions.includes('*');
}

function isTenantActive(keyInfo: ApiKeyInfo): boolean {
  return keyInfo.subscriptionStatus === 'active' || keyInfo.subscriptionStatus === 'trial';
}

export {
  generateApiKey,
  hashApiKey,
  createNewApiKey,
  validateApiKey,
  hasPermission,
  isTenantActive,
  ApiKeyInfo
};
