import { Types } from 'mongoose';
import { forbidden, notFound } from '../../common/http/api-error';
import { logger } from '../../config/logger';
import { getRealtimeServer } from '../../realtime/socket';
import type { GroupDocument } from '../groups/group.model';
import { NotificationModel, type NotificationDocument, type NotificationType } from './notification.model';
import type { ListNotificationsQuery } from './notification.schemas';

type GroupNotificationInput = {
  group: GroupDocument;
  type: NotificationType;
  eventName: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
};

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

const serializeNotification = (notification: NotificationDocument) => ({
  id: notification._id.toString(),
  user: notification.user.toString(),
  group: notification.group?.toString(),
  type: notification.type,
  title: notification.title,
  message: notification.message,
  payload: notification.payload,
  readAt: notification.readAt,
  createdAt: notification.createdAt
});

export const notifyGroupMembers = async (input: GroupNotificationInput): Promise<void> => {
  try {
    const notifications = await NotificationModel.insertMany(
      input.group.members.map((member) => ({
        user: member.user,
        group: input.group._id,
        type: input.type,
        title: input.title,
        message: input.message,
        payload: input.payload
      }))
    );

    const payload = {
      type: input.type,
      title: input.title,
      message: input.message,
      groupId: input.group._id.toString(),
      payload: input.payload,
      timestamp: new Date().toISOString()
    };

    const io = getRealtimeServer();
    io?.to(`group:${input.group._id.toString()}`).emit(input.eventName, payload);
    io?.to(`group:${input.group._id.toString()}`).emit('notification:new', {
      ...payload,
      notificationCount: notifications.length
    });
  } catch (error) {
    logger.error({
      err: error,
      groupId: input.group._id.toString(),
      notificationType: input.type
    }, 'Failed to dispatch group notification');
  }
};

export const listMyNotifications = async (userId: string, query: ListNotificationsQuery) => {
  const filter: Record<string, unknown> = {
    user: toObjectId(userId)
  };

  if (query.unreadOnly) filter.readAt = { $exists: false };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    NotificationModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    NotificationModel.countDocuments(filter)
  ]);

  return {
    notifications: items.map(serializeNotification),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const markNotificationRead = async (userId: string, notificationId: string) => {
  const notification = await NotificationModel.findById(notificationId);
  if (!notification) throw notFound('Notification not found.');

  if (notification.user.toString() !== userId) {
    throw forbidden('You can only update your own notifications.');
  }

  notification.readAt = notification.readAt ?? new Date();
  await notification.save();

  return serializeNotification(notification);
};
