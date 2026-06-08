import crypto from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import type { PaystackWebhookEvent } from './paystack.types';
import { verifyPaystackTransaction } from './paystack.client';
import { fulfillContributionPayment } from '../../modules/contributions/contribution.service';

const PAYSTACK_WEBHOOK_IPS = new Set([
  '52.31.139.75',
  '52.49.173.169',
  '52.214.14.220'
]);

export const paystackWebhookRouter = Router();

const verifySignature = (rawBody: Buffer, signature: string | undefined): boolean => {
  if (!signature) return false;

  const hash = crypto
    .createHmac('sha512', env.paystackSecretKey)
    .update(rawBody)
    .digest('hex');

  const verifiedSignature = signature;
  if (hash.length !== verifiedSignature.length) return false;

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(verifiedSignature));
};

paystackWebhookRouter.post('/', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const signature = req.header('x-paystack-signature');

  const requestIp = req.ip ?? '';

  if (env.paystackWebhookIpWhitelistEnabled && !PAYSTACK_WEBHOOK_IPS.has(requestIp)) {
    logger.warn({ ip: requestIp }, 'Rejected Paystack webhook from untrusted IP');
    return res.sendStatus(401);
  }

  if (!verifySignature(rawBody, signature)) {
    logger.warn('Rejected Paystack webhook with invalid signature');
    return res.sendStatus(401);
  }

  let event: PaystackWebhookEvent;

  try {
    event = JSON.parse(rawBody.toString('utf8')) as PaystackWebhookEvent;
  } catch (error) {
    logger.warn({ err: error }, 'Rejected malformed Paystack webhook payload');
    return res.sendStatus(400);
  }

  if (event.event === 'charge.success') {
    try {
      const transaction = await verifyPaystackTransaction(event.data.reference);
      const result = await fulfillContributionPayment(transaction.reference, transaction);

      logger.info({
        reference: transaction.reference,
        status: transaction.status,
        amount: transaction.amount,
        contributionId: result.contribution?.id,
        alreadyFulfilled: result.alreadyFulfilled
      }, 'Fulfilled Paystack charge.success webhook');
    } catch (error) {
      logger.error({
        err: error,
        reference: event.data.reference
      }, 'Failed to fulfill Paystack charge.success webhook');
      return res.sendStatus(500);
    }
  }

  return res.sendStatus(200);
});
