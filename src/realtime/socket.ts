import type http from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';

let io: Server | null = null;

export const configureRealtime = (server: http.Server): Server => {
  io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');
  });

  return io;
};

export const getRealtimeServer = (): Server | null => io;
