import { z } from 'zod';

export const resolveWithdrawalAccountSchema = z.object({
  body: z.object({
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    bankCode: z.string().trim().min(2).max(20)
  }).strict()
}).strict();

export const createWithdrawalAccountSchema = z.object({
  body: z.object({
    accountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits'),
    bankCode: z.string().trim().min(2).max(20),
    bankName: z.string().trim().min(2).max(120)
  }).strict()
}).strict();

export type ResolveWithdrawalAccountInput = z.infer<typeof resolveWithdrawalAccountSchema>['body'];
export type CreateWithdrawalAccountInput = z.infer<typeof createWithdrawalAccountSchema>['body'];
