import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { badRequest, conflict, unauthorized } from '../../common/http/api-error';
import { constantTimeEqual, createExpiryDate, generateOtp, sha256 } from '../../common/utils/crypto';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/jwt';
import { sendOtpEmail } from '../../integrations/brevo/brevo.service';
import { UserModel, type UserDocument } from './user.model';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyOtpInput
} from './auth.schemas';

const MAX_REFRESH_TOKENS = 5;
const OTP_RESEND_LIMIT = 3;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type SafeUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  groups: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

const toSafeUser = (user: UserDocument): SafeUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  groups: user.groups.map((groupId) => groupId.toString()),
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const issueTokens = async (user: UserDocument): Promise<AuthTokens> => {
  const accessToken = signAccessToken({
    userId: user._id.toString(),
    role: user.role
  });
  const refreshToken = signRefreshToken({
    userId: user._id.toString(),
    tokenVersion: Date.now()
  });

  const refreshTokenHash = sha256(refreshToken);
  const tokens = [refreshTokenHash, ...user.refreshTokens].slice(0, MAX_REFRESH_TOKENS);
  user.refreshTokens = tokens;
  await user.save();

  return { accessToken, refreshToken };
};

const setOtp = async (
  user: UserDocument,
  purpose: 'account_verification' | 'password_reset'
): Promise<string> => {
  const otpCode = env.otpDevMode ? '123456' : generateOtp();
  user.otpCode = sha256(otpCode);
  user.otpExpires = createExpiryDate(env.otpTtlMinutes);
  user.otpPurpose = purpose;
  await user.save();
  return otpCode;
};

const assertOtp = (
  user: UserDocument,
  otpCode: string,
  purpose: 'account_verification' | 'password_reset'
): void => {
  if (!user.otpCode || !user.otpExpires || !user.otpPurpose) {
    throw badRequest('No active OTP found. Please request a new code.');
  }

  if (user.otpPurpose !== purpose) {
    throw badRequest('OTP is not valid for this action.');
  }

  if (user.otpExpires.getTime() < Date.now()) {
    throw badRequest('OTP has expired. Please request a new code.');
  }

  if (!constantTimeEqual(user.otpCode, sha256(otpCode))) {
    throw badRequest('Invalid OTP code.');
  }
};

const clearOtp = (user: UserDocument): void => {
  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.otpPurpose = undefined;
};

const sendOtp = async (
  user: UserDocument,
  purpose: 'account_verification' | 'password_reset'
): Promise<string | undefined> => {
  const otpCode = await setOtp(user, purpose);
  await sendOtpEmail({
    toEmail: user.email,
    toName: user.fullName,
    otpCode,
    purpose
  });

  return env.otpDevMode ? otpCode : undefined;
};

const findUserForSecrets = async (email: string): Promise<UserDocument | null> =>
  UserModel.findOne({ email }).select('+passwordHash +otpCode +otpExpires +otpPurpose +otpResendCount +otpResendWindowStartedAt +refreshTokens');

const checkResendLimit = (user: UserDocument): void => {
  const now = Date.now();
  const windowStartedAt = user.otpResendWindowStartedAt?.getTime();
  const isWindowActive = windowStartedAt !== undefined && now - windowStartedAt < OTP_RESEND_WINDOW_MS;

  if (!isWindowActive) {
    user.otpResendWindowStartedAt = new Date();
    user.otpResendCount = 0;
  }

  if (user.otpResendCount >= OTP_RESEND_LIMIT) {
    throw badRequest('OTP resend limit reached. Please try again later.');
  }

  user.otpResendCount += 1;
};

export const register = async (input: RegisterInput): Promise<{
  user: SafeUser;
  devOtp?: string;
}> => {
  const existingUser = await UserModel.findOne({
    $or: [{ email: input.email }, { phone: input.phone }]
  });

  if (existingUser) {
    throw conflict('A user with this email or phone already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, env.bcryptSaltRounds);
  const user = await UserModel.create({
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    passwordHash
  });

  const userWithSecrets = await findUserForSecrets(user.email);
  if (!userWithSecrets) throw badRequest('Unable to prepare verification OTP.');

  const devOtp = await sendOtp(userWithSecrets, 'account_verification');

  return {
    user: toSafeUser(userWithSecrets),
    devOtp
  };
};

export const verifyOtp = async (input: VerifyOtpInput): Promise<{
  user: SafeUser;
  tokens: AuthTokens;
}> => {
  const user = await findUserForSecrets(input.email);
  if (!user) throw badRequest('Invalid OTP code.');

  assertOtp(user, input.otpCode, 'account_verification');
  user.isVerified = true;
  clearOtp(user);

  const tokens = await issueTokens(user);

  return {
    user: toSafeUser(user),
    tokens
  };
};

export const login = async (input: LoginInput): Promise<{
  user: SafeUser;
  tokens: AuthTokens;
}> => {
  const user = await findUserForSecrets(input.email);
  if (!user) throw unauthorized('Invalid email or password.');

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
  if (!isPasswordValid) throw unauthorized('Invalid email or password.');

  if (!user.isVerified) {
    throw unauthorized('Please verify your account before logging in.');
  }

  const tokens = await issueTokens(user);

  return {
    user: toSafeUser(user),
    tokens
  };
};

export const refresh = async (refreshToken: string | undefined): Promise<{
  user: SafeUser;
  tokens: AuthTokens;
}> => {
  if (!refreshToken) throw unauthorized('Refresh token is required.');

  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw unauthorized('Invalid refresh token.');
  }

  const user = await UserModel.findById(payload.userId).select('+refreshTokens');
  if (!user) throw unauthorized('Invalid refresh token.');

  const incomingHash = sha256(refreshToken);
  if (!user.refreshTokens.includes(incomingHash)) {
    user.refreshTokens = [];
    await user.save();
    throw unauthorized('Refresh token reuse detected. Please log in again.');
  }

  user.refreshTokens = user.refreshTokens.filter((tokenHash) => tokenHash !== incomingHash);
  const tokens = await issueTokens(user);

  return {
    user: toSafeUser(user),
    tokens
  };
};

export const logout = async (userId: string, refreshToken: string | undefined): Promise<void> => {
  if (!refreshToken) return;

  let resolvedUserId = userId;

  if (!resolvedUserId) {
    try {
      resolvedUserId = verifyRefreshToken(refreshToken).userId;
    } catch {
      return;
    }
  }

  const user = await UserModel.findById(resolvedUserId).select('+refreshTokens');
  if (!user) return;

  const tokenHash = sha256(refreshToken);
  user.refreshTokens = user.refreshTokens.filter((storedHash) => storedHash !== tokenHash);
  await user.save();
};

export const getCurrentUser = async (userId: string): Promise<SafeUser> => {
  const user = await UserModel.findById(userId);
  if (!user) throw unauthorized('Authenticated user no longer exists.');

  return toSafeUser(user);
};

export const resendOtp = async (input: ResendOtpInput): Promise<{
  devOtp?: string;
}> => {
  const user = await findUserForSecrets(input.email);
  if (!user) return {};

  if (user.isVerified) {
    throw badRequest('Account is already verified.');
  }

  checkResendLimit(user);
  const devOtp = await sendOtp(user, 'account_verification');
  await user.save();

  return { devOtp };
};

export const forgotPassword = async (input: ForgotPasswordInput): Promise<{
  devOtp?: string;
}> => {
  const user = await findUserForSecrets(input.email);
  if (!user) return {};

  checkResendLimit(user);
  const devOtp = await sendOtp(user, 'password_reset');
  await user.save();

  return { devOtp };
};

export const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const user = await findUserForSecrets(input.email);
  if (!user) throw badRequest('Invalid OTP code.');

  assertOtp(user, input.otpCode, 'password_reset');
  user.passwordHash = await bcrypt.hash(input.newPassword, env.bcryptSaltRounds);
  user.refreshTokens = [];
  clearOtp(user);
  await user.save();
};
