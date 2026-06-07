import { Router } from 'express';
import { env } from '../../config/env';
import { sendSuccess } from '../../common/http/response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  sendSuccess(res, 200, 'AjoSave API is healthy', {
    uptime: process.uptime(),
    environment: env.nodeEnv,
    docs: '/api-docs',
    openapi: '/openapi.json'
  });
});
