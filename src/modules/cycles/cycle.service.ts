import { badRequest, notFound } from '../../common/http/api-error';
import { GroupModel, type GroupDocument } from '../groups/group.model';
import { ContributionModel } from '../contributions/contribution.model';
import { CycleModel, type CycleDocument } from './cycle.model';
import { getRecipientForCycle } from './rotation.service';

const dueDateForFrequency = (frequency: GroupDocument['frequency'], fromDate = new Date()): Date => {
  const dueDate = new Date(fromDate);

  if (frequency === 'daily') dueDate.setDate(dueDate.getDate() + 1);
  if (frequency === 'weekly') dueDate.setDate(dueDate.getDate() + 7);
  if (frequency === 'monthly') dueDate.setMonth(dueDate.getMonth() + 1);

  return dueDate;
};

export const serializeCycle = (cycle: CycleDocument) => ({
  id: cycle._id.toString(),
  group: cycle.group.toString(),
  cycleNumber: cycle.cycleNumber,
  recipient: cycle.recipient.toString(),
  totalExpected: cycle.totalExpected,
  totalCollected: cycle.totalCollected,
  status: cycle.status,
  dueDate: cycle.dueDate,
  paidOutAt: cycle.paidOutAt,
  contributions: cycle.contributions.map((contribution) => contribution.toString()),
  createdAt: cycle.createdAt,
  updatedAt: cycle.updatedAt
});

export const createCycleForGroup = async (group: GroupDocument, cycleNumber: number): Promise<CycleDocument> => {
  const recipient = getRecipientForCycle(group, cycleNumber);

  if (!recipient) {
    throw badRequest('No recipient slot found for this cycle.');
  }

  const cycle = await CycleModel.create({
    group: group._id,
    cycleNumber,
    recipient: recipient.user,
    totalExpected: group.contributionAmount * group.members.length,
    totalCollected: 0,
    status: 'open',
    dueDate: dueDateForFrequency(group.frequency, group.startDate ?? new Date()),
    contributions: []
  });

  group.currentCycle = cycle._id;
  await group.save();

  return cycle;
};

export const getCurrentCycleForGroup = async (groupId: string): Promise<CycleDocument> => {
  const group = await GroupModel.findById(groupId);
  if (!group?.currentCycle) throw notFound('No active cycle found for this group.');

  const cycle = await CycleModel.findById(group.currentCycle);
  if (!cycle) throw notFound('No active cycle found for this group.');

  return cycle;
};

export const closeCycleIfFullyPaid = async (cycle: CycleDocument): Promise<CycleDocument> => {
  const confirmedCount = await ContributionModel.countDocuments({
    cycle: cycle._id,
    status: { $in: ['confirmed', 'late'] }
  });

  const group = await GroupModel.findById(cycle.group);
  if (!group) throw notFound('Group not found for cycle.');

  if (confirmedCount < group.members.length) {
    return cycle;
  }

  cycle.status = 'closed';
  await cycle.save();

  return cycle;
};
