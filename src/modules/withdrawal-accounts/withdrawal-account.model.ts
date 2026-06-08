import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type WithdrawalAccount = {
  user: Types.ObjectId;
  provider: 'paystack';
  bankCode: string;
  bankName: string;
  accountNumberLast4: string;
  accountName: string;
  recipientCode: string;
  currency: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const withdrawalAccountSchema = new Schema<WithdrawalAccount>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['paystack'],
    default: 'paystack',
    required: true
  },
  bankCode: {
    type: String,
    required: true,
    trim: true
  },
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  accountNumberLast4: {
    type: String,
    required: true,
    trim: true
  },
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  recipientCode: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  currency: {
    type: String,
    default: 'NGN',
    required: true
  },
  isDefault: {
    type: Boolean,
    default: true,
    required: true
  }
}, {
  timestamps: true,
  versionKey: false
});

withdrawalAccountSchema.index({ user: 1, provider: 1, bankCode: 1, accountNumberLast4: 1 });

export type WithdrawalAccountDocument = HydratedDocument<WithdrawalAccount>;
export type WithdrawalAccountModel = Model<WithdrawalAccount>;

export const WithdrawalAccountModel = model<WithdrawalAccount>('WithdrawalAccount', withdrawalAccountSchema);
