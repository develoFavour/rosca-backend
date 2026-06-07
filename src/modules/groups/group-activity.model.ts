import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type GroupActivityType =
  | 'group_created'
  | 'group_updated'
  | 'group_deleted'
  | 'member_joined'
  | 'member_left'
  | 'group_started';

export type GroupActivity = {
  group: Types.ObjectId;
  actor: Types.ObjectId;
  type: GroupActivityType;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const groupActivitySchema = new Schema<GroupActivity>({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  actor: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['group_created', 'group_updated', 'group_deleted', 'member_joined', 'member_left', 'group_started'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  metadata: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  versionKey: false
});

groupActivitySchema.index({ group: 1, createdAt: -1 });

export type GroupActivityDocument = HydratedDocument<GroupActivity>;
export type GroupActivityModel = Model<GroupActivity>;

export const GroupActivityModel = model<GroupActivity>('GroupActivity', groupActivitySchema);
