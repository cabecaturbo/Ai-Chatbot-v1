// Papercups integration for sending messages
import fetch from 'node-fetch';

interface PapercupsConfig {
  papercupsUrl: string;
  apiKey: string;
}

interface SendMessageParams {
  accountId: string;
  conversationId: string;
  text: string;
  userId?: string;
}

interface PapercupsMessage {
  id: string;
  body: string;
  sent_at: string;
  user_id?: string;
  conversation_id: string;
  account_id: string;
}

class PapercupsClient {
  private config: PapercupsConfig;

  constructor() {
    this.config = {
      papercupsUrl: process.env['PAPERCUPS_URL'] || 'http://localhost:4000',
      apiKey: process.env['PAPERCUPS_API_KEY'] || ''
    };
  }

  async sendMessage(params: SendMessageParams): Promise<PapercupsMessage> {
    const { accountId, conversationId, text, userId } = params;

    const response = await fetch(`${this.config.papercupsUrl}/api/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        message: {
          body: text,
          conversation_id: conversationId,
          account_id: accountId,
          user_id: userId || null,
          message_type: 'reply'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Papercups API error: ${response.status} ${errorText}`);
    }

    const data = await response.json() as { data: PapercupsMessage };
    return data.data;
  }

  async getConversation(accountId: string, conversationId: string): Promise<any> {
    const response = await fetch(
      `${this.config.papercupsUrl}/api/conversations/${conversationId}?account_id=${accountId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Papercups API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.data;
  }

  async createConversation(accountId: string, customerId?: string): Promise<any> {
    const response = await fetch(`${this.config.papercupsUrl}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        conversation: {
          account_id: accountId,
          customer_id: customerId || null,
          status: 'open'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Papercups API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.data;
  }
}

// Export singleton instance
export const papercupsClient = new PapercupsClient();

// Export individual functions for backward compatibility
export async function sendText(params: SendMessageParams): Promise<PapercupsMessage> {
  return papercupsClient.sendMessage(params);
}

export async function getConversation(accountId: string, conversationId: string): Promise<any> {
  return papercupsClient.getConversation(accountId, conversationId);
}

export async function createConversation(accountId: string, customerId?: string): Promise<any> {
  return papercupsClient.createConversation(accountId, customerId);
}
