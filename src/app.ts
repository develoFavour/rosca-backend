import express from 'express';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { logger } from './config/logger';
import { openApiSpec } from './docs/openapi';
import { applySecurityMiddleware } from './common/middleware/security';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler';
import { apiRouter } from './common/http/router';
import { paystackWebhookRouter } from './integrations/paystack/paystack.webhook';

export const createApp = (): express.Express => {
  const app = express();

  applySecurityMiddleware(app);
  app.use(pinoHttp({ logger }));

  app.use('/webhooks/paystack', express.raw({ type: 'application/json' }), paystackWebhookRouter);

  app.use(express.json({ limit: '25kb' }));
  app.use(express.urlencoded({ extended: true, limit: '25kb' }));

  app.get('/health', (_req, res) => {
    res.redirect(307, '/api/v1/health');
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.get('/openapi.json', (_req, res) => res.json(openApiSpec));
  app.use('/api/v1', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
