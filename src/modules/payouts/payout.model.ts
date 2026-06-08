import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'disbursed' | 'processing' | 'failed';

export type Payout = {
  group: Types.ObjectId;
  cycle: Types.ObjectId;
  recipient: Types.ObjectId;
  withdrawalAccount: Types.ObjectId;
  amount: number;
  status: PayoutStatus;
  requestedAt: Date;
  processedAt?: Date;
  processedBy?: Types.ObjectId;
  notes?: string;
  transferReference?: string;
  transferCode?: string;
  providerStatus?: string;
  providerResponse?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const payoutSchema = new Schema<Payout>({
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  cycle: {
    type: Schema.Types.ObjectId,
    ref: 'Cycle',
    required: true
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  withdrawalAccount: {
    type: Schema.Types.ObjectId,
    ref: 'WithdrawalAccount',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'processing', 'failed'],
    default: 'pending',
    required: true,
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  processedAt: Date,
  processedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  transferReference: {
    type: String,
    trim: true,
    sparse: true,
    unique: true
  },
  transferCode: String,
  providerStatus: String,
  providerResponse: {
    type: Schema.Types.Mixed
  }
}, {
  timestamps: true,
  versionKey: false
});

payoutSchema.index({ cycle: 1 }, { unique: true });
payoutSchema.index({ group: 1, status: 1 });

export type PayoutDocument = HydratedDocument<Payout>;
export type PayoutModel = Model<Payout>;

export const PayoutModel = model<Payout>('Payout', payoutSchema);
