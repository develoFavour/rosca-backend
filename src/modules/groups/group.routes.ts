import { Router } from 'express';
import { validateRequest } from '../../common/middleware/validate-request';
import { requireAuth, requireVerifiedUser } from '../auth/auth.middleware';
import {
  activityQuerySchema,
  createGroupSchema,
  groupIdParamSchema,
  joinGroupSchema,
  updateGroupSchema
} from './group.schemas';
import * as groupController from './group.controller';

export const groupRouter = Router();

groupRouter.use(requireAuth, requireVerifiedUser);

groupRouter.post('/', validateRequest(createGroupSchema), groupController.createGroup);
groupRouter.get('/', groupController.listMyGroups);
groupRouter.post('/join', validateRequest(joinGroupSchema), groupController.joinGroup);
groupRouter.get('/:groupId', validateRequest(groupIdParamSchema), groupController.getGroupDetails);
groupRouter.patch('/:groupId', validateRequest(updateGroupSchema), groupController.updateGroup);
groupRouter.delete('/:groupId', validateRequest(groupIdParamSchema), groupController.deleteGroup);
groupRouter.post('/:groupId/leave', validateRequest(groupIdParamSchema), groupController.leaveGroup);
groupRouter.post('/:groupId/start', validateRequest(groupIdParamSchema), groupController.startGroup);
groupRouter.get('/:groupId/members', validateRequest(groupIdParamSchema), groupController.listMembers);
groupRouter.get('/:groupId/activity', validateRequest(activityQuerySchema), groupController.listActivity);
