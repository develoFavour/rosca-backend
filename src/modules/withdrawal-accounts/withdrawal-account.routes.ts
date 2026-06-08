import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { requireAuth, requireVerifiedUser } from '../auth/auth.middleware';
import {
  createWithdrawalAccountSchema,
  resolveWithdrawalAccountSchema
} from './withdrawal-account.schemas';
import * as withdrawalAccountController from './withdrawal-account.controller';

export const withdrawalAccountRouter = Router();

withdrawalAccountRouter.use(requireAuth, requireVerifiedUser);

withdrawalAccountRouter.get('/banks', withdrawalAccountController.listBanks);
withdrawalAccountRouter.post('/resolve', validateRequest(resolveWithdrawalAccountSchema), withdrawalAccountController.resolveAccount);
withdrawalAccountRouter.post('/', validateRequest(createWithdrawalAccountSchema), withdrawalAccountController.createAccount);
withdrawalAccountRouter.get('/me', withdrawalAccountController.getMyAccount);
