import { createTenant, getTenantByEmail } from './db';
import { papercupsAccountService } from './papercups_account';
import { generateWidgetCode } from './widget_generator';

export interface OnboardTenantParams {
  name: string;
  email: string;
  companyName?: string;
  subscriptionPlan?: string;
}

export interface OnboardTenantResult {
  tenantId: string;
  papercupsAccountId: string;
  papercupsInboxId?: string | undefined;
  widgetCode: string;
  apiKey: string; // Same as papercupsAccountId
}

export interface TenantInfo {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  papercupsAccountId: string;
  papercupsInboxId?: string;
  isActive: boolean;
  widgetCode: string;
  apiKey: string;
}

/**
 * Tenant Onboarding Service
 * Handles the complete flow of creating a new tenant with Papercups integration
 */
export class TenantOnboardingService {
  
  /**
   * Onboard a new tenant with complete Papercups setup
   */
  async onboardTenant(params: OnboardTenantParams): Promise<OnboardTenantResult> {
    try {
      // Step 1: Check if tenant already exists
      const existingTenant = await getTenantByEmail(params.email);
      if (existingTenant) {
        throw new Error(`Tenant with email ${params.email} already exists`);
      }

      // Step 2: Create Papercups account
      console.log(`[TENANT ONBOARDING] Creating Papercups account for ${params.email}`);
      const papercupsAccount = await papercupsAccountService.createAccount({
        name: params.name,
        email: params.email,
        companyName: params.companyName || params.name
      });

      // Step 3: Create tenant in our database
      console.log(`[TENANT ONBOARDING] Creating tenant record for ${params.email}`);
      const tenantId = await createTenant(
        params.name,
        params.email,
        params.subscriptionPlan || 'basic',
        papercupsAccount.accountId,
        papercupsAccount.inboxId
      );

      // Step 4: Generate widget code
      console.log(`[TENANT ONBOARDING] Generating widget code for tenant ${tenantId}`);
      const tenant = {
        id: tenantId,
        name: params.name,
        email: params.email,
        subscription_status: 'trial' as const,
        subscription_plan: (params.subscriptionPlan || 'basic') as 'basic' | 'pro' | 'enterprise',
        papercups_account_id: papercupsAccount.accountId,
        papercups_inbox_id: papercupsAccount.inboxId,
        created_at: new Date(),
        updated_at: new Date(),
        is_active: true
      };

      const widgetCode = generateWidgetCode({
        tenant,
        customizations: {
          title: `Welcome to ${params.name}!`,
          subtitle: 'How can we help you today?',
          greeting: `Hi! Welcome to ${params.name}. How can we assist you?`
        }
      });

      return {
        tenantId,
        papercupsAccountId: papercupsAccount.accountId,
        papercupsInboxId: papercupsAccount.inboxId,
        widgetCode,
        apiKey: papercupsAccount.accountId // Same as account ID
      };

    } catch (error) {
      console.error('[TENANT ONBOARDING] Failed to onboard tenant:', error);
      throw new Error(`Tenant onboarding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get complete tenant information including widget code
   */
  async getTenantInfo(tenantId: string): Promise<TenantInfo | null> {
    try {
      const { getTenantById } = await import('./db');
      const tenant = await getTenantById(tenantId);
      
      if (!tenant) {
        return null;
      }

      // Generate widget code
      const widgetCode = generateWidgetCode({
        tenant,
        customizations: {
          title: `Welcome to ${tenant.name}!`,
          subtitle: 'How can we help you today?',
          greeting: `Hi! Welcome to ${tenant.name}. How can we assist you?`
        }
      });

      return {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        subscriptionStatus: tenant.subscription_status,
        subscriptionPlan: tenant.subscription_plan,
        papercupsAccountId: tenant.papercups_account_id,
        papercupsInboxId: tenant.papercups_inbox_id,
        isActive: tenant.is_active,
        widgetCode,
        apiKey: tenant.papercups_account_id // Same as account ID
      };

    } catch (error) {
      console.error('[TENANT ONBOARDING] Failed to get tenant info:', error);
      return null;
    }
  }

  /**
   * Get tenant information by Papercups account ID (API key)
   */
  async getTenantByApiKey(apiKey: string): Promise<TenantInfo | null> {
    try {
      const { getTenantByAccountId } = await import('./db');
      const tenant = await getTenantByAccountId(apiKey);
      
      if (!tenant) {
        return null;
      }

      // Generate widget code
      const widgetCode = generateWidgetCode({
        tenant,
        customizations: {
          title: `Welcome to ${tenant.name}!`,
          subtitle: 'How can we help you today?',
          greeting: `Hi! Welcome to ${tenant.name}. How can we assist you?`
        }
      });

      return {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        subscriptionStatus: tenant.subscription_status,
        subscriptionPlan: tenant.subscription_plan,
        papercupsAccountId: tenant.papercups_account_id,
        papercupsInboxId: tenant.papercups_inbox_id,
        isActive: tenant.is_active,
        widgetCode,
        apiKey: tenant.papercups_account_id // Same as account ID
      };

    } catch (error) {
      console.error('[TENANT ONBOARDING] Failed to get tenant by API key:', error);
      return null;
    }
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(tenantId: string, subscriptionPlan: string, subscriptionStatus: string): Promise<boolean> {
    try {
      const { getPool } = await import('./db');
      const p = getPool();
      if (!p) throw new Error('Database not available');

      await p.query(`
        UPDATE tenants 
        SET subscription_plan = $1, subscription_status = $2, updated_at = NOW()
        WHERE id = $3
      `, [subscriptionPlan, subscriptionStatus, tenantId]);

      return true;

    } catch (error) {
      console.error('[TENANT ONBOARDING] Failed to update subscription:', error);
      return false;
    }
  }

  /**
   * Deactivate tenant (soft delete)
   */
  async deactivateTenant(tenantId: string): Promise<boolean> {
    try {
      const { getPool } = await import('./db');
      const p = getPool();
      if (!p) throw new Error('Database not available');

      await p.query(`
        UPDATE tenants 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `, [tenantId]);

      return true;

    } catch (error) {
      console.error('[TENANT ONBOARDING] Failed to deactivate tenant:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tenantOnboardingService = new TenantOnboardingService();
