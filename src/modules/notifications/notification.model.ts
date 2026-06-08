import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type NotificationType =
  | 'member_joined'
  | 'cycle_started'
  | 'contribution_new'
  | 'contribution_confirmed'
  | 'cycle_closed'
  | 'payout_requested'
  | 'payout_approved'
  | 'payout_rejected'
  | 'payout_disbursed';

export type Notification = {
  user: Types.ObjectId;
  group?: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<Notification>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    index: true
  },
  type: {
    type: String,
    enum: [
      'member_joined',
      'cycle_started',
      'contribution_new',
      'contribution_confirmed',
      'cycle_closed',
      'payout_requested',
      'payout_approved',
      'payout_rejected',
      'payout_disbursed'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  payload: {
    type: Schema.Types.Mixed
  },
  readAt: Date
}, {
  timestamps: true,
  versionKey: false
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ group: 1, createdAt: -1 });

export type NotificationDocument = HydratedDocument<Notification>;
export type NotificationModel = Model<Notification>;

export const NotificationModel = model<Notification>('Notification', notificationSchema);
