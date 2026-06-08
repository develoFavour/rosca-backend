import { Types } from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../common/http/api-error';
import { generateInviteCode } from '../../common/utils/invite-code';
import { UserModel } from '../auth/user.model';
import { createCycleForGroup, serializeCycle } from '../cycles/cycle.service';
import { lockRotationOrder } from '../cycles/rotation.service';
import { GroupActivityModel, type GroupActivityType } from './group-activity.model';
import { GroupModel, type GroupDocument, type GroupMember } from './group.model';
import { notifyGroupMembers } from '../notifications/notification.service';
import type { ActivityQuery, CreateGroupInput, UpdateGroupInput } from './group.schemas';

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

type PublicGroupUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type LeanPublicUser = Omit<PublicGroupUser, 'id'> & {
  _id: Types.ObjectId;
};

const isSameId = (left: Types.ObjectId, right: string): boolean => left.toString() === right;

const isMember = (group: GroupDocument, userId: string): boolean =>
  group.members.some((member) => isSameId(member.user, userId));

const isAdmin = (group: GroupDocument, userId: string): boolean => isSameId(group.admin, userId);

const createActivity = async (
  group: GroupDocument,
  actorId: string,
  type: GroupActivityType,
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> => {
  await GroupActivityModel.create({
    group: group._id,
    actor: toObjectId(actorId),
    type,
    message,
    metadata
  });
};

const createUniqueInviteCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const inviteCode = generateInviteCode();
    const exists = await GroupModel.exists({ inviteCode });
    if (!exists) return inviteCode;
  }

  throw new Error('Unable to generate unique invite code');
};

const serializePublicUser = (user: LeanPublicUser): PublicGroupUser => ({
  id: user._id.toString(),
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isVerified: user.isVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

const getPublicUsersById = async (userIds: string[]): Promise<Map<string, PublicGroupUser>> => {
  const uniqueIds = [...new Set(userIds)];
  const users = await UserModel.find({ _id: { $in: uniqueIds } })
    .select('fullName email phone role isVerified createdAt updatedAt')
    .lean<LeanPublicUser[]>();

  return new Map(users.map((user) => [user._id.toString(), serializePublicUser(user)]));
};

const serializeMember = (member: GroupMember, usersById: Map<string, PublicGroupUser>) => ({
  user: usersById.get(member.user.toString()) ?? member.user.toString(),
  slotPosition: member.slotPosition,
  hasReceivedPayout: member.hasReceivedPayout,
  joinedAt: member.joinedAt
});

const serializeGroup = async (group: GroupDocument) => {
  const usersById = await getPublicUsersById([
    group.admin.toString(),
    ...group.members.map((member) => member.user.toString())
  ]);

  return {
    id: group._id.toString(),
    name: group.name,
    description: group.description,
    admin: usersById.get(group.admin.toString()) ?? group.admin.toString(),
    members: group.members.map((member) => serializeMember(member, usersById)),
    contributionAmount: group.contributionAmount,
    frequency: group.frequency,
    maxMembers: group.maxMembers,
    inviteCode: group.inviteCode,
    status: group.status,
    currentCycle: group.currentCycle?.toString(),
    rotationOrder: group.rotationOrder,
    startDate: group.startDate,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt
  };
};

const getGroupOrThrow = async (groupId: string): Promise<GroupDocument> => {
  const group = await GroupModel.findOne({
    _id: groupId,
    status: { $ne: 'deleted' }
  });

  if (!group) throw notFound('Group not found.');
  return group;
};

const assertMember = (group: GroupDocument, userId: string): void => {
  if (!isMember(group, userId)) {
    throw forbidden('You must be a group member to access this resource.');
  }
};

const assertAdmin = (group: GroupDocument, userId: string): void => {
  if (!isAdmin(group, userId)) {
    throw forbidden('Only the group admin can perform this action.');
  }
};

export const createGroup = async (userId: string, input: CreateGroupInput) => {
  const inviteCode = await createUniqueInviteCode();
  const userObjectId = toObjectId(userId);

  const group = await GroupModel.create({
    name: input.name,
    description: input.description,
    admin: userObjectId,
    members: [{
      user: userObjectId,
      slotPosition: 1,
      hasReceivedPayout: false
    }],
    contributionAmount: input.contributionAmount,
    frequency: input.frequency,
    maxMembers: input.maxMembers,
    inviteCode,
    rotationOrder: input.rotationOrder,
    status: 'pending'
  });

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { groups: group._id }
  });

  await createActivity(group, userId, 'group_created', `Group "${group.name}" was created.`, {
    inviteCode: group.inviteCode
  });

  return serializeGroup(group);
};

export const listMyGroups = async (userId: string) => {
  const groups = await GroupModel.find({
    status: { $ne: 'deleted' },
    'members.user': userId
  }).sort({ createdAt: -1 });

  return Promise.all(groups.map(serializeGroup));
};

export const getGroupDetails = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);
  return serializeGroup(group);
};

export const updateGroup = async (userId: string, groupId: string, input: UpdateGroupInput) => {
  const group = await getGroupOrThrow(groupId);
  assertAdmin(group, userId);

  if (group.status !== 'pending') {
    throw badRequest('Only pending groups can be updated.');
  }

  if (input.maxMembers !== undefined && input.maxMembers < group.members.length) {
    throw badRequest('maxMembers cannot be less than the current member count.');
  }

  Object.assign(group, input);
  await group.save();
  await createActivity(group, userId, 'group_updated', `Group "${group.name}" was updated.`);

  return serializeGroup(group);
};

export const deleteGroup = async (userId: string, groupId: string): Promise<void> => {
  const group = await getGroupOrThrow(groupId);
  assertAdmin(group, userId);

  if (group.status !== 'pending') {
    throw badRequest('Only pending groups can be deleted.');
  }

  group.status = 'deleted';
  group.deletedAt = new Date();
  await group.save();

  await UserModel.updateMany({
    groups: group._id
  }, {
    $pull: { groups: group._id }
  });

  await createActivity(group, userId, 'group_deleted', `Group "${group.name}" was deleted.`);
};

export const joinGroup = async (userId: string, inviteCode: string) => {
  const group = await GroupModel.findOne({
    inviteCode,
    status: 'pending'
  });

  if (!group) throw notFound('No pending group found for this invite code.');

  if (isMember(group, userId)) {
    throw conflict('You are already a member of this group.');
  }

  if (group.members.length >= group.maxMembers) {
    throw conflict('This group is already full.');
  }

  const slotPosition = group.members.length + 1;
  group.members.push({
    user: toObjectId(userId),
    slotPosition,
    hasReceivedPayout: false,
    joinedAt: new Date()
  });
  await group.save();

  await UserModel.findByIdAndUpdate(userId, {
    $addToSet: { groups: group._id }
  });

  await createActivity(group, userId, 'member_joined', 'A new member joined the group.', {
    currentMemberCount: group.members.length
  });

  await notifyGroupMembers({
    group,
    type: 'member_joined',
    eventName: 'member:joined',
    title: 'New member joined',
    message: 'A new member joined the group.',
    payload: {
      groupId: group._id.toString(),
      userId,
      currentMemberCount: group.members.length
    }
  });

  return serializeGroup(group);
};

export const leaveGroup = async (userId: string, groupId: string): Promise<void> => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  if (group.status !== 'pending') {
    throw badRequest('Members can only leave a pending group.');
  }

  if (isAdmin(group, userId)) {
    throw badRequest('Group admin cannot leave. Delete the pending group instead.');
  }

  group.members = group.members
    .filter((member) => !isSameId(member.user, userId))
    .map((member, index) => ({
      ...member,
      slotPosition: index + 1
    }));
  await group.save();

  await UserModel.findByIdAndUpdate(userId, {
    $pull: { groups: group._id }
  });

  await createActivity(group, userId, 'member_left', 'A member left the group.', {
    currentMemberCount: group.members.length
  });
};

export const startGroup = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertAdmin(group, userId);

  if (group.status !== 'pending') {
    throw badRequest('Only pending groups can be started.');
  }

  if (group.members.length < 2) {
    throw badRequest('At least two members are required to start a group.');
  }

  if (group.members.length !== group.maxMembers) {
    throw badRequest('Group must be full before it can be started.');
  }

  lockRotationOrder(group);
  group.status = 'active';
  group.startDate = new Date();
  await group.save();

  const cycle = await createCycleForGroup(group, 1);

  await createActivity(group, userId, 'group_started', `Group "${group.name}" was started.`, {
    memberCount: group.members.length,
    rotationOrder: group.rotationOrder,
    cycleId: cycle._id.toString()
  });

  await notifyGroupMembers({
    group,
    type: 'cycle_started',
    eventName: 'cycle:started',
    title: 'Cycle started',
    message: `Cycle ${cycle.cycleNumber} has started.`,
    payload: {
      groupId: group._id.toString(),
      cycleId: cycle._id.toString(),
      cycleNumber: cycle.cycleNumber,
      recipientId: cycle.recipient.toString(),
      dueDate: cycle.dueDate
    }
  });

  return {
    group: await serializeGroup(group),
    cycle: serializeCycle(cycle)
  };
};

export const listMembers = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);
  const usersById = await getPublicUsersById(group.members.map((member) => member.user.toString()));
  return group.members.map((member) => serializeMember(member, usersById));
};

export const listActivity = async (userId: string, groupId: string, query: ActivityQuery) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    GroupActivityModel.find({ group: group._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    GroupActivityModel.countDocuments({ group: group._id })
  ]);

  return {
    activities: items.map((activity) => ({
      id: activity._id.toString(),
      group: activity.group.toString(),
      actor: activity.actor.toString(),
      type: activity.type,
      message: activity.message,
      metadata: activity.metadata,
      createdAt: activity.createdAt
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};
