import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { createBrevoTransactionalEmailClient } from './brevo.client';

type SendOtpEmailInput = {
  toEmail: string;
  toName: string;
  otpCode: string;
  purpose: 'account_verification' | 'password_reset';
};

const purposeSubject: Record<SendOtpEmailInput['purpose'], string> = {
  account_verification: 'Verify your AjoSave account',
  password_reset: 'Reset your AjoSave password'
};

const purposeIntro: Record<SendOtpEmailInput['purpose'], string> = {
  account_verification: 'Use this code to verify your AjoSave account.',
  password_reset: 'Use this code to reset your AjoSave password.'
};

export const sendOtpEmail = async (input: SendOtpEmailInput): Promise<void> => {
  if (env.otpDevMode && !env.brevoApiKey) {
    logger.info({
      toEmail: input.toEmail,
      otpCode: input.otpCode,
      purpose: input.purpose
    }, 'OTP email skipped in dev mode');
    return;
  }

  const client = createBrevoTransactionalEmailClient();
  if (!client) {
    throw new Error('Brevo API key is required when OTP_DEV_MODE is false');
  }

  await client.sendTransacEmail({
    sender: {
      email: env.brevoSenderEmail,
      name: env.brevoSenderName
    },
    to: [
      {
        email: input.toEmail,
        name: input.toName
      }
    ],
    subject: purposeSubject[input.purpose],
    htmlContent: `
      <p>Hello ${input.toName},</p>
      <p>${purposeIntro[input.purpose]}</p>
      <p>Your AjoSave OTP is <strong>${input.otpCode}</strong>.</p>
      <p>This code expires in ${env.otpTtlMinutes} minutes.</p>
      <p>If you did not request this code, you can safely ignore this email.</p>
    `
  });
};
