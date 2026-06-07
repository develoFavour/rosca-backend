import http from 'node:http';
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { configureRealtime } from './realtime/socket';

const start = async (): Promise<void> => {
  await connectDatabase();

  const app = createApp();
  const server = http.createServer(app);

  configureRealtime(server);

  server.listen(env.port, () => {
    logger.info({
      api: env.apiBaseUrl,
      docs: `${env.apiBaseUrl}/api-docs`
    }, 'AjoSave API listening');
  });
};

void start().catch((error) => {
  logger.error({ err: error }, 'Failed to start server');
  process.exit(1);
});
