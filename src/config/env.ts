import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const booleanFromEnv = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  if (['true', '1', 'yes', 'on'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no', 'off'].includes(value.toLowerCase())) return false;
  return value;
}, z.boolean());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url().default('http://localhost:5000'),
  CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/ajosave-dev'),
  JWT_ACCESS_SECRET: z.string().min(24).default('dev-access-secret-change-me-now'),
  JWT_REFRESH_SECRET: z.string().min(24).default('dev-refresh-secret-change-me-now'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16).default('dev-cookie-secret-change-me'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(10).default(12),
  OTP_TTL_MINUTES: z.coerce.number().int().positive().default(10),
  OTP_DEV_MODE: booleanFromEnv.default(true),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(150),
  BREVO_API_KEY: z.string().min(1).optional(),
  BREVO_SENDER_EMAIL: z.string().email().default('no-reply@ajosave.example'),
  BREVO_SENDER_NAME: z.string().default('AjoSave'),
  PAYSTACK_SECRET_KEY: z.string().min(1).default('sk_test_replace_with_paystack_secret'),
  PAYSTACK_PUBLIC_KEY: z.string().min(1).default('pk_test_replace_with_paystack_public'),
  PAYSTACK_BASE_URL: z.string().url().default('https://api.paystack.co'),
  PAYSTACK_CALLBACK_URL: z.string().url().optional(),
  PAYSTACK_WEBHOOK_IP_WHITELIST_ENABLED: booleanFromEnv.default(false),
  PAYOUT_TRANSFER_MODE: z.enum(['paystack', 'simulate']).default('simulate')
}).superRefine((value, ctx) => {
  if (value.NODE_ENV !== 'production') return;

  const forbiddenProductionValues = [
    ['MONGODB_URI', 'mongodb://127.0.0.1:27017/ajosave-dev'],
    ['JWT_ACCESS_SECRET', 'dev-access-secret-change-me-now'],
    ['JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me-now'],
    ['COOKIE_SECRET', 'dev-cookie-secret-change-me'],
    ['PAYSTACK_SECRET_KEY', 'sk_test_replace_with_paystack_secret'],
    ['PAYSTACK_PUBLIC_KEY', 'pk_test_replace_with_paystack_public']
  ];

  for (const [key, forbiddenValue] of forbiddenProductionValues) {
    if (value[key as keyof typeof value] === forbiddenValue) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: `${key} must be configured with a real production value`
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const message = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${message}`);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  isTest: parsed.data.NODE_ENV === 'test',
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  apiBaseUrl: parsed.data.API_BASE_URL,
  clientOrigin: parsed.data.CLIENT_ORIGIN,
  mongodbUri: parsed.data.MONGODB_URI,
  jwtAccessSecret: parsed.data.JWT_ACCESS_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
  jwtRefreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  cookieSecret: parsed.data.COOKIE_SECRET,
  bcryptSaltRounds: parsed.data.BCRYPT_SALT_ROUNDS,
  otpTtlMinutes: parsed.data.OTP_TTL_MINUTES,
  otpDevMode: parsed.data.OTP_DEV_MODE,
  rateLimitWindowMinutes: parsed.data.RATE_LIMIT_WINDOW_MINUTES,
  rateLimitMax: parsed.data.RATE_LIMIT_MAX,
  brevoApiKey: parsed.data.BREVO_API_KEY,
  brevoSenderEmail: parsed.data.BREVO_SENDER_EMAIL,
  brevoSenderName: parsed.data.BREVO_SENDER_NAME,
  paystackSecretKey: parsed.data.PAYSTACK_SECRET_KEY,
  paystackPublicKey: parsed.data.PAYSTACK_PUBLIC_KEY,
  paystackBaseUrl: parsed.data.PAYSTACK_BASE_URL,
  paystackCallbackUrl: parsed.data.PAYSTACK_CALLBACK_URL,
  paystackWebhookIpWhitelistEnabled: parsed.data.PAYSTACK_WEBHOOK_IP_WHITELIST_ENABLED,
  payoutTransferMode: parsed.data.PAYOUT_TRANSFER_MODE
} as const;
