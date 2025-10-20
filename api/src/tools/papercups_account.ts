// import { papercupsClient } from './papercups_send'; // Not used in this file

export interface PapercupsAccountInfo {
  accountId: string;
  inboxId?: string | undefined;
  name: string;
  email: string;
}

export interface CreateAccountParams {
  name: string;
  email: string;
  companyName?: string;
}

/**
 * Papercups Account Management Service
 * Handles creation and management of Papercups accounts for tenants
 */
export class PapercupsAccountService {
  private papercupsUrl: string;
  private apiKey: string;

  constructor() {
    this.papercupsUrl = process.env['PAPERCUPS_URL'] || 'https://papercups.netia.ai';
    this.apiKey = process.env['PAPERCUPS_API_KEY'] || '';
    
    if (!this.apiKey) {
      console.warn('[PAPERCUPS ACCOUNT] No API key configured. Account creation will fail.');
    }
  }

  /**
   * Create a new Papercups account for a tenant
   */
  async createAccount(params: CreateAccountParams): Promise<PapercupsAccountInfo> {
    if (!this.apiKey) {
      throw new Error('Papercups API key not configured');
    }

    try {
      // Step 1: Create the account
      const accountResponse = await fetch(`${this.papercupsUrl}/api/accounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          account: {
            company_name: params.companyName || params.name,
            subscription_plan: 'starter'
          }
        })
      });

      if (!accountResponse.ok) {
        const errorText = await accountResponse.text();
        throw new Error(`Failed to create Papercups account: ${accountResponse.status} ${errorText}`);
      }

      const accountData = await accountResponse.json() as any;
      const accountId = accountData.data.id;

      // Step 2: Create a user for the account
      const userResponse = await fetch(`${this.papercupsUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          user: {
            email: params.email,
            first_name: params.name.split(' ')[0] || params.name,
            last_name: params.name.split(' ').slice(1).join(' ') || '',
            account_id: accountId,
            role: 'admin'
          }
        })
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.warn(`Failed to create user for account ${accountId}: ${errorText}`);
        // Continue without user creation - account is still valid
      }

      // Step 3: Get or create default inbox
      let inboxId: string | undefined;
      try {
        const inboxResponse = await fetch(`${this.papercupsUrl}/api/inboxes?account_id=${accountId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        });

        if (inboxResponse.ok) {
          const inboxData = await inboxResponse.json() as any;
          if (inboxData.data && inboxData.data.length > 0) {
            inboxId = inboxData.data[0].id;
          } else {
            // Create default inbox if none exists
            const createInboxResponse = await fetch(`${this.papercupsUrl}/api/inboxes`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify({
                inbox: {
                  name: `${params.name} Support`,
                  account_id: accountId
                }
              })
            });

            if (createInboxResponse.ok) {
              const inboxData = await createInboxResponse.json() as any;
              inboxId = inboxData.data.id;
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to get/create inbox for account ${accountId}:`, error);
        // Continue without inbox - account is still valid
      }

      return {
        accountId,
        inboxId,
        name: params.name,
        email: params.email
      };

    } catch (error) {
      console.error('[PAPERCUPS ACCOUNT] Failed to create account:', error);
      throw new Error(`Failed to create Papercups account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get account information by account ID
   */
  async getAccount(accountId: string): Promise<PapercupsAccountInfo | null> {
    if (!this.apiKey) {
      throw new Error('Papercups API key not configured');
    }

    try {
      const response = await fetch(`${this.papercupsUrl}/api/accounts/${accountId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get account: ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        accountId: data.data.id,
        name: data.data.company_name,
        email: '', // Not available in account data
        inboxId: undefined // Would need separate call to get inboxes
      };

    } catch (error) {
      console.error('[PAPERCUPS ACCOUNT] Failed to get account:', error);
      return null;
    }
  }

  /**
   * Delete an account (for cleanup/testing)
   */
  async deleteAccount(accountId: string): Promise<boolean> {
    if (!this.apiKey) {
      throw new Error('Papercups API key not configured');
    }

    try {
      const response = await fetch(`${this.papercupsUrl}/api/accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        }
      });

      return response.ok;

    } catch (error) {
      console.error('[PAPERCUPS ACCOUNT] Failed to delete account:', error);
      return false;
    }
  }
}

// Export singleton instance
export const papercupsAccountService = new PapercupsAccountService();
