import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type PaymentPurpose = 'contribution';
export type PaymentStatus = 'initialized' | 'pending' | 'success' | 'failed' | 'abandoned';

export type PaymentTransaction = {
  user: Types.ObjectId;
  group: Types.ObjectId;
  cycle: Types.ObjectId;
  contribution?: Types.ObjectId;
  purpose: PaymentPurpose;
  provider: 'paystack';
  reference: string;
  accessCode?: string;
  authorizationUrl?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  providerStatus?: string;
  providerResponse?: Record<string, unknown>;
  fulfilledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

const paymentTransactionSchema = new Schema<PaymentTransaction>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  group: {
    type: Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  cycle: {
    type: Schema.Types.ObjectId,
    ref: 'Cycle',
    required: true,
    index: true
  },
  contribution: {
    type: Schema.Types.ObjectId,
    ref: 'Contribution'
  },
  purpose: {
    type: String,
    enum: ['contribution'],
    default: 'contribution',
    required: true
  },
  provider: {
    type: String,
    enum: ['paystack'],
    default: 'paystack',
    required: true
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  accessCode: String,
  authorizationUrl: String,
  amount: {
    type: Number,
    required: true,
    min: 1
  },
  currency: {
    type: String,
    default: 'NGN',
    required: true
  },
  status: {
    type: String,
    enum: ['initialized', 'pending', 'success', 'failed', 'abandoned'],
    default: 'initialized',
    required: true,
    index: true
  },
  providerStatus: String,
  providerResponse: {
    type: Schema.Types.Mixed
  },
  fulfilledAt: Date
}, {
  timestamps: true,
  versionKey: false
});

paymentTransactionSchema.index({ cycle: 1, user: 1, purpose: 1 });

export type PaymentTransactionDocument = HydratedDocument<PaymentTransaction>;
export type PaymentTransactionModel = Model<PaymentTransaction>;

export const PaymentTransactionModel = model<PaymentTransaction>('PaymentTransaction', paymentTransactionSchema);
