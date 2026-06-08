import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const booleanQuery = z.preprocess((value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}, z.boolean());

export const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    unreadOnly: booleanQuery.default(false)
  }).strict()
}).strict();

export const notificationIdParamSchema = z.object({
  params: z.object({
    notificationId: objectId
  }).strict()
}).strict();

export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>['query'];
export type NotificationIdParams = z.infer<typeof notificationIdParamSchema>['params'];
