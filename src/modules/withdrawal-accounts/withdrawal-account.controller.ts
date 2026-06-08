import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import type { CreateWithdrawalAccountInput, ResolveWithdrawalAccountInput } from './withdrawal-account.schemas';
import * as withdrawalAccountService from './withdrawal-account.service';

const currentUserId = (req: Request): string => req.auth?.userId ?? '';

export const listBanks = asyncHandler(async (_req: Request, res: Response) => {
  const banks = await withdrawalAccountService.listBanks();
  return sendSuccess(res, 200, 'Banks retrieved successfully.', { banks });
});

export const resolveAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await withdrawalAccountService.resolveWithdrawalAccount(
    (req.validated as { body: ResolveWithdrawalAccountInput }).body
  );

  return sendSuccess(res, 200, 'Withdrawal account resolved successfully.', { account });
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await withdrawalAccountService.createWithdrawalAccount(
    currentUserId(req),
    (req.validated as { body: CreateWithdrawalAccountInput }).body
  );

  return sendSuccess(res, 201, 'Withdrawal account saved successfully.', { account });
});

export const getMyAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await withdrawalAccountService.getMyWithdrawalAccount(currentUserId(req));
  return sendSuccess(res, 200, 'Withdrawal account retrieved successfully.', { account });
});
