import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/http/async-handler';
import { sendSuccess } from '../../common/http/response';
import type { ActivityQuery, CreateGroupInput, GroupIdParams, JoinGroupInput, UpdateGroupInput } from './group.schemas';
import * as groupService from './group.service';

const currentUserId = (req: Request): string => req.auth?.userId ?? '';

export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const group = await groupService.createGroup(currentUserId(req), (req.validated as { body: CreateGroupInput }).body);
  return sendSuccess(res, 201, 'Group created successfully.', { group });
});

export const listMyGroups = asyncHandler(async (req: Request, res: Response) => {
  const groups = await groupService.listMyGroups(currentUserId(req));
  return sendSuccess(res, 200, 'Groups retrieved successfully.', { groups });
});

export const getGroupDetails = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  const group = await groupService.getGroupDetails(currentUserId(req), groupId);
  return sendSuccess(res, 200, 'Group retrieved successfully.', { group });
});

export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const validated = req.validated as { params: GroupIdParams; body: UpdateGroupInput };
  const group = await groupService.updateGroup(currentUserId(req), validated.params.groupId, validated.body);
  return sendSuccess(res, 200, 'Group updated successfully.', { group });
});

export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  await groupService.deleteGroup(currentUserId(req), groupId);
  return sendSuccess(res, 200, 'Group deleted successfully.');
});

export const joinGroup = asyncHandler(async (req: Request, res: Response) => {
  const { inviteCode } = (req.validated as { body: JoinGroupInput }).body;
  const group = await groupService.joinGroup(currentUserId(req), inviteCode);
  return sendSuccess(res, 200, 'Joined group successfully.', { group });
});

export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  await groupService.leaveGroup(currentUserId(req), groupId);
  return sendSuccess(res, 200, 'Left group successfully.');
});

export const startGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  const group = await groupService.startGroup(currentUserId(req), groupId);
  return sendSuccess(res, 200, 'Group started successfully.', { group });
});

export const listMembers = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = (req.validated as { params: GroupIdParams }).params;
  const members = await groupService.listMembers(currentUserId(req), groupId);
  return sendSuccess(res, 200, 'Group members retrieved successfully.', { members });
});

export const listActivity = asyncHandler(async (req: Request, res: Response) => {
  const validated = req.validated as { params: GroupIdParams; query: ActivityQuery };
  const result = await groupService.listActivity(currentUserId(req), validated.params.groupId, validated.query);
  return sendSuccess(res, 200, 'Group activity retrieved successfully.', { activities: result.activities }, result.meta);
});
