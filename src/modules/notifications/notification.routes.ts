import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { requireAuth, requireVerifiedUser } from '../auth/auth.middleware';
import { listNotificationsSchema, notificationIdParamSchema } from './notification.schemas';
import * as notificationController from './notification.controller';

export const notificationRouter = Router();

notificationRouter.use(requireAuth, requireVerifiedUser);

notificationRouter.get('/', validateRequest(listNotificationsSchema), notificationController.listMyNotifications);
notificationRouter.patch('/:notificationId/read', validateRequest(notificationIdParamSchema), notificationController.markRead);
