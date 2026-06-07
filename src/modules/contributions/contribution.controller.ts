import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import type {
  ContributionIdParams,
  CycleIdParams,
  GroupIdParams,
  InitializeContributionPaymentInput,
  PaginatedQuery,
  VerifyContributionPaymentInput
} from './contribution.schemas';
import * as contributionService from './contribution.service';

const currentUserId = (req: Request): string => req.auth?.userId ?? '';

export const initializePayment = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { body: InitializeContributionPaymentInput }).body;
  const result = await contributionService.initializeContributionPayment(currentUserId(req), groupId);

  return sendSuccess(res, 201, 'Contribution payment initialized successfully.', result);
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const { reference } = (req.validated as { body: VerifyContributionPaymentInput }).body;
  const result = await contributionService.verifyContributionPayment(currentUserId(req), reference);

  return sendSuccess(res, 200, 'Contribution payment verified successfully.', result);
});

export const listGroupContributions = asyncHandler(async (req: Request, res: Response) => {
  const validated = req.validated as { params: GroupIdParams; query: PaginatedQuery };
  const result = await contributionService.listGroupContributions(
    currentUserId(req),
    validated.params.groupId,
    validated.query
  );

  return sendSuccess(res, 200, 'Group contributions retrieved successfully.', {
    contributions: result.contributions
  }, result.meta);
});

export const listCycleContributions = asyncHandler(async (req: Request, res: Response) => {
  const { cycleId } = (req.validated as { params: CycleIdParams }).params;
  const contributions = await contributionService.listCycleContributions(currentUserId(req), cycleId);

  return sendSuccess(res, 200, 'Cycle contributions retrieved successfully.', { contributions });
});

export const listMyContributions = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  const contributions = await contributionService.listMyContributions(currentUserId(req), groupId);

  return sendSuccess(res, 200, 'My contributions retrieved successfully.', { contributions });
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  const status = await contributionService.getContributionStatus(currentUserId(req), groupId);

  return sendSuccess(res, 200, 'Contribution status retrieved successfully.', status);
});

export const confirmContribution = asyncHandler(async (req: Request, res: Response) => {
  const { contribId } = (req.validated as { params: ContributionIdParams }).params;
  const contribution = await contributionService.confirmContribution(currentUserId(req), contribId);

  return sendSuccess(res, 200, 'Contribution confirmed successfully.', { contribution });
});
