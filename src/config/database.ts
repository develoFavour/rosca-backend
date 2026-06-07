import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongodbUri, {
    autoIndex: !env.isProduction
  });

  logger.info({ database: mongoose.connection.name }, 'MongoDB connected');
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.connection.close();
};
