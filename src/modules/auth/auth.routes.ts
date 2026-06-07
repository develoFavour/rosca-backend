import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import {
  authIpLimiter,
  forgotPasswordLimiter,
  loginLimiter,
  resendOtpLimiter,
  resetPasswordLimiter,
  verifyOtpLimiter
} from '../../common/middleware/security';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema
} from './auth.schemas';
import * as authController from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRouter = Router();

authRouter.use(authIpLimiter);

authRouter.post('/register', validateRequest(registerSchema), authController.register);
authRouter.post('/verify-otp', verifyOtpLimiter, validateRequest(verifyOtpSchema), authController.verifyOtp);
authRouter.post('/login', loginLimiter, validateRequest(loginSchema), authController.login);
authRouter.post('/refresh', validateRequest(refreshSchema), authController.refresh);
authRouter.post('/logout', requireAuth, authController.logout);
authRouter.get('/me', requireAuth, authController.me);
authRouter.post('/resend-otp', resendOtpLimiter, validateRequest(resendOtpSchema), authController.resendOtp);
authRouter.post('/forgot-password', forgotPasswordLimiter, validateRequest(forgotPasswordSchema), authController.forgotPassword);
authRouter.post('/reset-password', resetPasswordLimiter, validateRequest(resetPasswordSchema), authController.resetPassword);
