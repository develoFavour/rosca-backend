export type PaystackInitializeTransactionInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
};

export type PaystackInitializeTransactionData = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export type PaystackVerifyTransactionData = {
  id: number;
  status: 'success' | 'abandoned' | 'failed' | 'ongoing' | 'pending' | 'processing' | 'queued' | 'reversed';
  reference: string;
  amount: number;
  currency: string;
  paid_at?: string;
  gateway_response?: string;
  channel?: string;
  customer?: {
    email?: string;
    customer_code?: string;
  };
  metadata?: Record<string, unknown> | string;
};

export type PaystackApiResponse<TData> = {
  status: boolean;
  message: string;
  data: TData;
};

export type PaystackWebhookEvent = {
  event: string;
  data: PaystackVerifyTransactionData & Record<string, unknown>;
};
