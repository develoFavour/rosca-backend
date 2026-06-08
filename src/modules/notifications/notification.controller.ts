import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import type { ListNotificationsQuery, NotificationIdParams } from './notification.schemas';
import * as notificationService from './notification.service';

const currentUserId = (req: Request): string => req.auth?.userId ?? '';

export const listMyNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.validated as { query: ListNotificationsQuery };
  const result = await notificationService.listMyNotifications(currentUserId(req), query);

  return sendSuccess(res, 200, 'Notifications retrieved successfully.', {
    notifications: result.notifications
  }, result.meta);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const { notificationId } = (req.validated as { params: NotificationIdParams }).params;
  const notification = await notificationService.markNotificationRead(currentUserId(req), notificationId);

  return sendSuccess(res, 200, 'Notification marked as read.', { notification });
});
