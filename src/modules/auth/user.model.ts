import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type OtpPurpose = 'account_verification' | 'password_reset';

export type User = {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isVerified: boolean;
  otpCode?: string;
  otpExpires?: Date;
  otpPurpose?: OtpPurpose;
  otpResendCount: number;
  otpResendWindowStartedAt?: Date;
  refreshTokens: string[];
  groups: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<User>({
  fullName: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 120
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false,
    required: true
  },
  otpCode: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  otpPurpose: {
    type: String,
    enum: ['account_verification', 'password_reset'],
    select: false
  },
  otpResendCount: {
    type: Number,
    default: 0,
    select: false
  },
  otpResendWindowStartedAt: {
    type: Date,
    select: false
  },
  refreshTokens: {
    type: [String],
    default: [],
    select: false
  },
  groups: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }]
}, {
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_doc, ret) => {
      const safeRet = ret as Partial<User>;
      delete safeRet.passwordHash;
      delete safeRet.otpCode;
      delete safeRet.otpExpires;
      delete safeRet.otpPurpose;
      delete safeRet.otpResendCount;
      delete safeRet.otpResendWindowStartedAt;
      delete safeRet.refreshTokens;
      return ret;
    }
  }
});

export type UserDocument = HydratedDocument<User>;
export type UserModel = Model<User>;

export const UserModel = model<User>('User', userSchema);
