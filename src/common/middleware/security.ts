import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { Express, Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import helmet from 'helmet';
import hpp from 'hpp';
import { env } from '../../config/env';

const rateLimitMessage = {
  success: false,
  message: 'Too many attempts. Please retry later.'
};

const emailFromBody = (req: Request): string => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  return typeof email === 'string' ? email.trim().toLowerCase() : 'unknown-email';
};

const authKey = (scope: string) => (req: Request): string => {
  const ipKey = ipKeyGenerator(req.ip ?? 'unknown-ip');
  return `${ipKey}:${scope}:${emailFromBody(req)}`;
};

const createAuthLimiter = (scope: string, max: number, windowMs: number) => rateLimit({
  windowMs,
  max,
  skip: () => env.isTest,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: authKey(scope),
  message: rateLimitMessage
});

export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  skip: () => env.isTest,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage
});

export const loginLimiter = createAuthLimiter('login', 5, 15 * 60 * 1000);
export const verifyOtpLimiter = createAuthLimiter('verify-otp', 5, 15 * 60 * 1000);
export const resendOtpLimiter = createAuthLimiter('resend-otp', 3, 60 * 60 * 1000);
export const forgotPasswordLimiter = createAuthLimiter('forgot-password', 3, 60 * 60 * 1000);
export const resetPasswordLimiter = createAuthLimiter('reset-password', 5, 15 * 60 * 1000);

const sanitizeNoSqlOperators = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeNoSqlOperators(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    sanitized[key] = sanitizeNoSqlOperators(nestedValue);
  }

  return sanitized;
};

export const applySecurityMiddleware = (app: Express): void => {
  app.use(helmet());
  app.use(cors({
    origin: env.clientOrigin,
    credentials: true
  }));
  app.use(compression());
  app.use(cookieParser(env.cookieSecret));
  app.use(rateLimit({
    windowMs: env.rateLimitWindowMinutes * 60 * 1000,
    max: env.rateLimitMax,
    skip: () => env.isTest,
    standardHeaders: true,
    legacyHeaders: false
  }));
  app.use((req, _res, next) => {
    if (req.body) req.body = sanitizeNoSqlOperators(req.body);
    if (req.params) req.params = sanitizeNoSqlOperators(req.params) as typeof req.params;
    next();
  });
  app.use(hpp());
};
