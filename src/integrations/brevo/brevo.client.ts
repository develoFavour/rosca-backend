import { BrevoClient } from '@getbrevo/brevo';
import { env } from '../../config/env';

export const createBrevoTransactionalEmailClient = () => {
  if (!env.brevoApiKey) return null;

  return new BrevoClient({
    apiKey: env.brevoApiKey,
    timeoutInSeconds: 15,
    maxRetries: 2
  }).transactionalEmails;
};
