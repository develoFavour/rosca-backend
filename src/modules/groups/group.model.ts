import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type GroupFrequency = 'daily' | 'weekly' | 'monthly';
export type GroupStatus = 'pending' | 'active' | 'completed' | 'paused' | 'deleted';
export type RotationOrder = 'sequential' | 'random' | 'bidding';

export type GroupMember = {
  user: Types.ObjectId;
  slotPosition: number;
  hasReceivedPayout: boolean;
  joinedAt: Date;
};

export type Group = {
  name: string;
  description?: string;
  admin: Types.ObjectId;
  members: GroupMember[];
  contributionAmount: number;
  frequency: GroupFrequency;
  maxMembers: number;
  inviteCode: string;
  status: GroupStatus;
  currentCycle?: Types.ObjectId;
  rotationOrder: RotationOrder;
  startDate?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const groupMemberSchema = new Schema<GroupMember>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  slotPosition: {
    type: Number,
    required: true,
    min: 1
  },
  hasReceivedPayout: {
    type: Boolean,
    default: false,
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now,
    required: true
  }
}, {
  _id: false
});

const groupSchema = new Schema<Group>({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  admin: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  members: {
    type: [groupMemberSchema],
    default: [],
    required: true
  },
  contributionAmount: {
    type: Number,
    required: true,
    min: 1
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  maxMembers: {
    type: Number,
    required: true,
    min: 2,
    max: 100
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'paused', 'deleted'],
    default: 'pending',
    required: true,
    index: true
  },
  currentCycle: {
    type: Schema.Types.ObjectId,
    ref: 'Cycle'
  },
  rotationOrder: {
    type: String,
    enum: ['sequential', 'random', 'bidding'],
    default: 'sequential',
    required: true
  },
  startDate: Date,
  deletedAt: Date
}, {
  timestamps: true,
  versionKey: false
});

groupSchema.index({ 'members.user': 1 });

export type GroupDocument = HydratedDocument<Group>;
export type GroupModel = Model<Group>;

export const GroupModel = model<Group>('Group', groupSchema);
