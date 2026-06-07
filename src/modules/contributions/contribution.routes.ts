import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { requireAuth, requireVerifiedUser } from '../auth/auth.middleware';
import {
  contributionIdParamSchema,
  cycleIdParamSchema,
  groupIdParamSchema,
  initializeContributionPaymentSchema,
  paginatedGroupContributionsSchema,
  verifyContributionPaymentSchema
} from './contribution.schemas';
import * as contributionController from './contribution.controller';

export const contributionRouter = Router();

contributionRouter.use(requireAuth, requireVerifiedUser);

contributionRouter.post('/initialize-payment', validateRequest(initializeContributionPaymentSchema), contributionController.initializePayment);
contributionRouter.post('/verify-payment', validateRequest(verifyContributionPaymentSchema), contributionController.verifyPayment);
contributionRouter.get('/group/:groupId', validateRequest(paginatedGroupContributionsSchema), contributionController.listGroupContributions);
contributionRouter.get('/cycle/:cycleId', validateRequest(cycleIdParamSchema), contributionController.listCycleContributions);
contributionRouter.get('/my/:groupId', validateRequest(groupIdParamSchema), contributionController.listMyContributions);
contributionRouter.patch('/:contribId/confirm', validateRequest(contributionIdParamSchema), contributionController.confirmContribution);
contributionRouter.get('/status/:groupId', validateRequest(groupIdParamSchema), contributionController.getStatus);
