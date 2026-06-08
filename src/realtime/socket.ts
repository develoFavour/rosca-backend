import type http from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from '../common/utils/jwt';
import { UserModel } from '../modules/auth/user.model';
import { GroupModel } from '../modules/groups/group.model';

let io: Server | null = null;

const tokenFromHandshake = (socketToken: unknown, authorizationHeader: unknown): string | undefined => {
  if (typeof socketToken === 'string') return socketToken;

  if (typeof authorizationHeader === 'string') {
    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme?.toLowerCase() === 'bearer') return token;
  }

  return undefined;
};

const groupIdsForUser = async (userId: string): Promise<string[]> => {
  const groups = await GroupModel.find({
    status: { $ne: 'deleted' },
    'members.user': userId
  }).select('_id');

  return groups.map((group) => group._id.toString());
};

export const configureRealtime = (server: http.Server): Server => {
  io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    const token = tokenFromHandshake(socket.handshake.auth.token, socket.handshake.headers.authorization);

    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      const user = await UserModel.findById(payload.userId).select('isVerified');

      if (!user || !user.isVerified) {
        next(new Error('Verified user required'));
        return;
      }

      socket.data.userId = payload.userId;
      socket.data.groupIds = await groupIdsForUser(payload.userId);
      next();
    } catch (error) {
      logger.warn({ err: error }, 'Socket authentication failed');
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const groupIds = socket.data.groupIds as string[];

    for (const groupId of groupIds) {
      socket.join(`group:${groupId}`);
    }

    logger.info({
      socketId: socket.id,
      userId: socket.data.userId,
      groupCount: groupIds.length
    }, 'Socket connected');
  });

  return io;
};

export const getRealtimeServer = (): Server | null => io;
