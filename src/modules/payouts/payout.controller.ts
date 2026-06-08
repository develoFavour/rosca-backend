import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import type {
  GroupPayoutsParams,
  PayoutIdParams,
  PayoutPaginationQuery,
  RejectPayoutInput,
  RequestPayoutInput
} from './payout.schemas';
import * as payoutService from './payout.service';

const currentUserId = (req: Request): string => req.auth?.userId ?? '';

export const requestPayout = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { body: RequestPayoutInput }).body;
  const result = await payoutService.requestPayout(currentUserId(req), groupId);

  return sendSuccess(res, 201, 'Payout requested successfully.', result);
});

export const approvePayout = asyncHandler(async (req: Request, res: Response) => {
  const { payoutId } = (req.validated as { params: PayoutIdParams }).params;
  const result = await payoutService.approvePayout(currentUserId(req), payoutId);

  return sendSuccess(res, 200, 'Payout approved successfully.', result);
});

export const rejectPayout = asyncHandler(async (req: Request, res: Response) => {
  const validated = req.validated as { params: PayoutIdParams; body: RejectPayoutInput };
  const payout = await payoutService.rejectPayout(currentUserId(req), validated.params.payoutId, validated.body.notes);

  return sendSuccess(res, 200, 'Payout rejected successfully.', { payout });
});

export const getPayout = asyncHandler(async (req: Request, res: Response) => {
  const { payoutId } = (req.validated as { params: PayoutIdParams }).params;
  const payout = await payoutService.getPayout(currentUserId(req), payoutId);

  return sendSuccess(res, 200, 'Payout retrieved successfully.', { payout });
});

export const listGroupPayouts = asyncHandler(async (req: Request, res: Response) => {
  const validated = req.validated as { params: GroupPayoutsParams; query: PayoutPaginationQuery };
  const result = await payoutService.listGroupPayouts(currentUserId(req), validated.params.groupId, validated.query);

  return sendSuccess(res, 200, 'Group payouts retrieved successfully.', {
    payouts: result.payouts
  }, result.meta);
});
