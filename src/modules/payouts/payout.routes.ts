import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { requireAuth, requireVerifiedUser } from '../auth/auth.middleware';
import {
  groupPayoutsSchema,
  payoutIdParamSchema,
  rejectPayoutSchema,
  requestPayoutSchema
} from './payout.schemas';
import * as payoutController from './payout.controller';

export const payoutRouter = Router();

payoutRouter.use(requireAuth, requireVerifiedUser);

payoutRouter.post('/request', validateRequest(requestPayoutSchema), payoutController.requestPayout);
payoutRouter.get('/group/:groupId', validateRequest(groupPayoutsSchema), payoutController.listGroupPayouts);
payoutRouter.get('/:payoutId', validateRequest(payoutIdParamSchema), payoutController.getPayout);
payoutRouter.patch('/:payoutId/approve', validateRequest(payoutIdParamSchema), payoutController.approvePayout);
payoutRouter.patch('/:payoutId/reject', validateRequest(rejectPayoutSchema), payoutController.rejectPayout);
