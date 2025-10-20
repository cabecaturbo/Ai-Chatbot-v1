// Papercups integration types
export interface PapercupsPayload {
  type: string;
  data: {
    id: string;
    body: string;
    sent_at: string;
    user_id?: string;
    conversation_id: string;
    account_id: string;
    message_type: 'reply' | 'note' | 'chat';
  };
  account_id: string;
  timestamp: number;
}

export interface PapercupsWebhookRequest {
  body: PapercupsPayload;
  headers: {
    'x-papercups-signature': string;
    'content-type': string;
  };
}

export interface PapercupsMessage {
  id: string;
  body: string;
  sent_at: string;
  user_id?: string;
  conversation_id: string;
  account_id: string;
  message_type: 'reply' | 'note' | 'chat';
}

export interface PapercupsConversation {
  id: string;
  account_id: string;
  customer_id?: string;
  status: 'open' | 'closed' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface PapercupsCustomer {
  id: string;
  account_id: string;
  email?: string;
  name?: string;
  created_at: string;
  updated_at: string;
}

export interface PapercupsAccount {
  id: string;
  name: string;
  domain?: string;
  created_at: string;
  updated_at: string;
}
