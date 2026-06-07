import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type CycleStatus = 'open' | 'closed' | 'paid_out';

export type Cycle = {
  group: Types.ObjectId;
  cycleNumber: number;
  recipient: Types.ObjectId;
  totalExpected: number;
  totalCollected: number;
  status: CycleStatus;
  dueDate: Date;
  paidOutAt?: Date;
  contributions: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

const cycleSchema = new Schema<Cycle>({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  cycleNumber: {
    type: Number,
    required: true,
    min: 1
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalExpected: {
    type: Number,
    required: true,
    min: 1
  },
  totalCollected: {
    type: Number,
    default: 0,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['open', 'closed', 'paid_out'],
    default: 'open',
    required: true,
    index: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidOutAt: Date,
  contributions: [{
    type: Schema.Types.ObjectId,
    ref: 'Contribution'
  }]
}, {
  timestamps: true,
  versionKey: false
});

cycleSchema.index({ group: 1, cycleNumber: 1 }, { unique: true });
cycleSchema.index({ group: 1, status: 1 });

export type CycleDocument = HydratedDocument<Cycle>;
export type CycleModel = Model<Cycle>;

export const CycleModel = model<Cycle>('Cycle', cycleSchema);
