import { request } from 'undici';
import { env } from '../../config/env';
import type {
  PaystackApiResponse,
  PaystackInitializeTransactionData,
  PaystackInitializeTransactionInput,
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
