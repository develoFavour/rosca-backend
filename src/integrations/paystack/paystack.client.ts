import { request } from 'undici';
import { env } from '../../config/env';
import type {
  PaystackApiResponse,
  PaystackBank,
  PaystackCreateRecipientInput,
  PaystackInitiateTransferInput,
  PaystackInitializeTransactionData,
  PaystackInitializeTransactionInput,
  PaystackResolvedAccount,
  PaystackTransferData,
  PaystackTransferRecipientData,
  PaystackVerifyTransactionData
} from './paystack.types';

const paystackRequest = async <TData>(
  path: string,
  options: {
    method: 'GET' | 'POST';
    body?: Record<string, unknown>;
  }
): Promise<PaystackApiResponse<TData>> => {
  const response = await request(`${env.paystackBaseUrl}${path}`, {
    method: options.method,
    headers: {
      authorization: `Bearer ${env.paystackSecretKey}`,
      'content-type': 'application/json'
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = await response.body.json() as PaystackApiResponse<TData>;

  if (response.statusCode >= 400 || !payload.status) {
    throw new Error(payload.message || 'Paystack request failed');
  }

  return payload;
};

export const initializePaystackTransaction = async (
  input: PaystackInitializeTransactionInput
): Promise<PaystackInitializeTransactionData> => {
  const payload = await paystackRequest<PaystackInitializeTransactionData>('/transaction/initialize', {
    method: 'POST',
    body: {
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl ?? env.paystackCallbackUrl,
      metadata: input.metadata,
      channels: input.channels
    }
  });

  return payload.data;
};

export const verifyPaystackTransaction = async (
  reference: string
): Promise<PaystackVerifyTransactionData> => {
  const payload = await paystackRequest<PaystackVerifyTransactionData>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: 'GET' }
  );

  return payload.data;
};

export const listPaystackBanks = async (): Promise<PaystackBank[]> => {
  const payload = await paystackRequest<PaystackBank[]>('/bank?country=nigeria&currency=NGN', {
    method: 'GET'
  });

  return payload.data;
};

export const resolvePaystackAccountNumber = async (
  accountNumber: string,
  bankCode: string
): Promise<PaystackResolvedAccount> => {
  const query = new URLSearchParams({
    account_number: accountNumber,
    bank_code: bankCode
  });

  const payload = await paystackRequest<PaystackResolvedAccount>(`/bank/resolve?${query.toString()}`, {
    method: 'GET'
  });

  return payload.data;
};

export const createPaystackTransferRecipient = async (
  input: PaystackCreateRecipientInput
): Promise<PaystackTransferRecipientData> => {
  const payload = await paystackRequest<PaystackTransferRecipientData>('/transferrecipient', {
    method: 'POST',
    body: {
      type: 'nuban',
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: input.currency ?? 'NGN',
      description: input.description
    }
  });

  return payload.data;
};

export const initiatePaystackTransfer = async (
  input: PaystackInitiateTransferInput
): Promise<PaystackTransferData> => {
  const payload = await paystackRequest<PaystackTransferData>('/transfer', {
    method: 'POST',
    body: {
      source: 'balance',
      amount: input.amountKobo,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason,
      currency: input.currency ?? 'NGN'
    }
  });

  return payload.data;
};
