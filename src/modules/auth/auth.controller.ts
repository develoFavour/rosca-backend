import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import { REFRESH_TOKEN_COOKIE, clearRefreshTokenCookie, setRefreshTokenCookie } from './auth.cookies';
import * as authService from './auth.service';
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResendOtpInput,
  ResetPasswordInput,
  VerifyOtpInput
} from './auth.schemas';

const getRefreshToken = (req: Request): string | undefined => {
  const bodyRefreshToken = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
  const cookieRefreshToken = req.signedCookies?.[REFRESH_TOKEN_COOKIE] as string | undefined;
  return bodyRefreshToken ?? cookieRefreshToken;
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register((req.validated as { body: RegisterInput }).body);

  return sendSuccess(res, 201, 'Registration successful. Please verify your account with the OTP sent to your email.', result);
});

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.verifyOtp((req.validated as { body: VerifyOtpInput }).body);
  setRefreshTokenCookie(res, result.tokens.refreshToken);

  return sendSuccess(res, 200, 'Account verified successfully.', result);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login((req.validated as { body: LoginInput }).body);
  setRefreshTokenCookie(res, result.tokens.refreshToken);

  return sendSuccess(res, 200, 'Login successful.', result);
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(getRefreshToken(req));
  setRefreshTokenCookie(res, result.tokens.refreshToken);

  return sendSuccess(res, 200, 'Access token refreshed successfully.', result);
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.auth?.userId ?? '', getRefreshToken(req));
  clearRefreshTokenCookie(res);

  return sendSuccess(res, 200, 'Logout successful.');
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.auth?.userId ?? '');

  return sendSuccess(res, 200, 'Authenticated user retrieved successfully.', { user });
});

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resendOtp((req.validated as { body: ResendOtpInput }).body);

  return sendSuccess(res, 200, 'If the account exists and is not verified, a new OTP has been sent.', result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword((req.validated as { body: ForgotPasswordInput }).body);

  return sendSuccess(res, 200, 'If the account exists, a password reset OTP has been sent.', result);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword((req.validated as { body: ResetPasswordInput }).body);

  return sendSuccess(res, 200, 'Password reset successful. Please log in again.');
});
