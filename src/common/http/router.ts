import { Router } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';
import { groupRouter } from '../../modules/groups/group.routes';
import { healthRouter } from '../../modules/health/health.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/groups', groupRouter);
