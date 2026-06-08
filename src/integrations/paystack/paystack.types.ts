export type PaystackInitializeTransactionInput = {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  channels?: string[];
};

export type PaystackBank = {
  id: number;
  name: string;
  slug: string;
  code: string;
  longcode?: string;
  gateway?: string;
  pay_with_bank?: boolean;
  supports_transfer?: boolean;
  active?: boolean;
  country?: string;
  currency?: string;
  type?: string;
  is_deleted?: boolean;
};

export type PaystackResolvedAccount = {
  account_number: string;
  account_name: string;
  bank_id: number;
};

export type PaystackCreateRecipientInput = {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
  description?: string;
};

export type PaystackTransferRecipientData = {
  active: boolean;
  createdAt: string;
  currency: string;
  domain: string;
  id: number;
  integration: number;
  name: string;
  recipient_code: string;
  type: string;
  updatedAt: string;
  is_deleted: boolean;
  details: {
    authorization_code?: string | null;
    account_number: string;
    account_name?: string | null;
    bank_code: string;
    bank_name: string;
  };
};

export type PaystackInitiateTransferInput = {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason: string;
  currency?: string;
};

export type PaystackTransferData = {
  amount: number;
  currency: string;
  domain: string;
  failures: unknown;
  id: number;
  integration: number;
  reason: string;
  reference: string;
  source: string;
  source_details: unknown;
  status: 'pending' | 'success' | 'failed' | 'otp' | 'queued' | 'reversed';
  titan_code?: string | null;
  transfer_code: string;
  transferred_at?: string | null;
  recipient: number | string | PaystackTransferRecipientData;
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
