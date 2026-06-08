import { Router } from 'express';
import { authRouter } from '../../modules/auth/auth.routes';
import { contributionRouter } from '../../modules/contributions/contribution.routes';
import { groupRouter } from '../../modules/groups/group.routes';
import { healthRouter } from '../../modules/health/health.routes';
import { notificationRouter } from '../../modules/notifications/notification.routes';
import { payoutRouter } from '../../modules/payouts/payout.routes';
import { withdrawalAccountRouter } from '../../modules/withdrawal-accounts/withdrawal-account.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/groups', groupRouter);
apiRouter.use('/contributions', contributionRouter);
apiRouter.use('/withdrawal-accounts', withdrawalAccountRouter);
apiRouter.use('/payouts', payoutRouter);
apiRouter.use('/notifications', notificationRouter);
