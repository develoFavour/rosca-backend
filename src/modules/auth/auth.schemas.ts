import { z } from 'zod';

const email = z.string().trim().email().toLowerCase();
const password = z.string().min(8).max(128);
const otpCode = z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code');

export const registerSchema = z.object({
  body: z.object({
    fullName: z.string().trim().min(2).max(120),
    email,
    phone: z.string().trim().min(7).max(20),
    password
  })
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email,
    otpCode
  })
});

export const loginSchema = z.object({
  body: z.object({
    email,
    password
  })
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(20).optional()
  }).optional()
});

export const resendOtpSchema = z.object({
  body: z.object({
    email
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email,
    otpCode,
    newPassword: password
  })
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ResendOtpInput = z.infer<typeof resendOtpSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
