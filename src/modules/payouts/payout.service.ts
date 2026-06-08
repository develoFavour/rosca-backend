import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../common/http/api-error';
import { env } from '../../config/env';
import { initiatePaystackTransfer } from '../../integrations/paystack/paystack.client';
import type { PaystackTransferData } from '../../integrations/paystack/paystack.types';
import { createCycleForGroup, getCurrentCycleForGroup, serializeCycle } from '../cycles/cycle.service';
import { GroupModel, type GroupDocument } from '../groups/group.model';
import { notifyGroupMembers } from '../notifications/notification.service';
import { getDefaultWithdrawalAccountDocument, serializeWithdrawalAccount } from '../withdrawal-accounts/withdrawal-account.service';
import { PayoutModel, type PayoutDocument } from './payout.model';
import type { PayoutPaginationQuery } from './payout.schemas';

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

const isMember = (group: GroupDocument, userId: string): boolean =>
  group.members.some((member) => member.user.toString() === userId);

const isAdmin = (group: GroupDocument, userId: string): boolean => group.admin.toString() === userId;

const assertMember = (group: GroupDocument, userId: string): void => {
  if (!isMember(group, userId)) throw forbidden('You must be a group member to access payouts.');
};

const assertAdmin = (group: GroupDocument, userId: string): void => {
  if (!isAdmin(group, userId)) throw forbidden('Only the group admin can perform this action.');
};

const getGroupOrThrow = async (groupId: string): Promise<GroupDocument> => {
  const group = await GroupModel.findOne({
    _id: groupId,
    status: { $ne: 'deleted' }
  });

  if (!group) throw notFound('Group not found.');
  return group;
};

const transferStatusToPayoutStatus = (status: string) => {
  if (status === 'success') return 'disbursed' as const;
  if (status === 'failed' || status === 'reversed') return 'failed' as const;
  return 'processing' as const;
};

const generateTransferReference = (payoutId: string): string =>
  `ajo-payout-${payoutId.slice(-12)}-${crypto.randomBytes(4).toString('hex')}`;

const integrationMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const simulateTransfer = (
  payout: PayoutDocument,
  reference: string,
  recipientCode: string
): PaystackTransferData => ({
  amount: payout.amount * 100,
  currency: 'NGN',
  domain: 'test',
  failures: null,
  id: Date.now(),
  integration: 0,
  reason: `Simulated AjoSave payout for cycle ${payout.cycle.toString()}`,
  reference,
  source: 'balance',
  source_details: null,
  status: 'success',
  titan_code: null,
  transfer_code: `SIM_${payout._id.toString().slice(-12)}`,
  transferred_at: new Date().toISOString(),
  recipient: recipientCode
});

export const serializePayout = (payout: PayoutDocument) => ({
  id: payout._id.toString(),
  group: payout.group.toString(),
  cycle: payout.cycle.toString(),
  recipient: payout.recipient.toString(),
  withdrawalAccount: payout.withdrawalAccount.toString(),
  amount: payout.amount,
  status: payout.status,
  requestedAt: payout.requestedAt,
  processedAt: payout.processedAt,
  processedBy: payout.processedBy?.toString(),
  notes: payout.notes,
  transferReference: payout.transferReference,
  transferCode: payout.transferCode,
  providerStatus: payout.providerStatus,
  createdAt: payout.createdAt,
  updatedAt: payout.updatedAt
});

const advanceAfterDisbursement = async (group: GroupDocument, payout: PayoutDocument) => {
  const cycle = await getCurrentCycleForGroup(group._id.toString());
  cycle.status = 'paid_out';
  cycle.paidOutAt = new Date();
  await cycle.save();

  group.members = group.members.map((member) => {
    if (member.user.toString() !== payout.recipient.toString()) return member;
    return {
      ...member,
      hasReceivedPayout: true
    };
  });

  const hasMoreCycles = group.members.some((member) => !member.hasReceivedPayout);

  if (!hasMoreCycles) {
    group.status = 'completed';
    group.currentCycle = undefined;
    await group.save();
    return {
      nextCycle: undefined,
      groupCompleted: true
    };
  }

  const nextCycleNumber = cycle.cycleNumber + 1;
  const nextCycle = await createCycleForGroup(group, nextCycleNumber);

  return {
    nextCycle: serializeCycle(nextCycle),
    groupCompleted: false
  };
};

export const requestPayout = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const cycle = await getCurrentCycleForGroup(groupId);

  if (cycle.status !== 'closed') {
    throw badRequest('Payout can only be requested after the cycle is closed.');
  }

  if (cycle.recipient.toString() !== userId) {
    throw forbidden('Only the assigned cycle recipient can request payout.');
  }

  const existing = await PayoutModel.exists({ cycle: cycle._id });
  if (existing) throw conflict('Payout has already been requested for this cycle.');

  const withdrawalAccount = await getDefaultWithdrawalAccountDocument(userId);

  const payout = await PayoutModel.create({
    group: group._id,
    cycle: cycle._id,
    recipient: toObjectId(userId),
    withdrawalAccount: withdrawalAccount._id,
    amount: cycle.totalCollected,
    status: 'pending',
    requestedAt: new Date()
  });

  await notifyGroupMembers({
    group,
    type: 'payout_requested',
    eventName: 'payout:requested',
    title: 'Payout requested',
    message: 'The cycle recipient has requested payout approval.',
    payload: {
      payoutId: payout._id.toString(),
      groupId: group._id.toString(),
      cycleId: cycle._id.toString(),
      recipientId: userId,
      amount: payout.amount
    }
  });

  return {
    payout: serializePayout(payout),
    withdrawalAccount: serializeWithdrawalAccount(withdrawalAccount)
  };
};

export const approvePayout = async (adminId: string, payoutId: string) => {
  const payout = await PayoutModel.findById(payoutId);
  if (!payout) throw notFound('Payout not found.');

  if (payout.status === 'disbursed' || payout.status === 'processing') {
    return {
      payout: serializePayout(payout),
      alreadyProcessed: true
    };
  }

  if (payout.status !== 'pending') {
    throw badRequest('Only pending payouts can be approved.');
  }

  const group = await getGroupOrThrow(payout.group.toString());
  assertAdmin(group, adminId);

  const withdrawalAccount = await getDefaultWithdrawalAccountDocument(payout.recipient.toString());
  const reference = generateTransferReference(payout._id.toString());
  let transfer: PaystackTransferData;

  if (env.payoutTransferMode === 'simulate') {
    transfer = simulateTransfer(payout, reference, withdrawalAccount.recipientCode);
  } else {
    try {
      transfer = await initiatePaystackTransfer({
        amountKobo: payout.amount * 100,
        recipientCode: withdrawalAccount.recipientCode,
        reference,
        reason: `AjoSave payout for cycle ${payout.cycle.toString()}`
      });
    } catch (error) {
      throw badRequest(integrationMessage(error, 'Unable to initiate Paystack payout transfer.'));
    }
  }

  payout.status = transferStatusToPayoutStatus(transfer.status);
  payout.processedAt = new Date();
  payout.processedBy = toObjectId(adminId);
  payout.transferReference = transfer.reference;
  payout.transferCode = transfer.transfer_code;
  payout.providerStatus = transfer.status;
  payout.providerResponse = transfer as unknown as Record<string, unknown>;
  await payout.save();

  const advance = payout.status === 'disbursed'
    ? await advanceAfterDisbursement(group, payout)
    : { nextCycle: undefined, groupCompleted: false };

  await notifyGroupMembers({
    group,
    type: payout.status === 'disbursed' ? 'payout_disbursed' : 'payout_approved',
    eventName: 'payout:approved',
    title: payout.status === 'disbursed' ? 'Payout disbursed' : 'Payout approved',
    message: payout.status === 'disbursed'
      ? 'The recipient payout has been sent through Paystack.'
      : 'The payout was approved and is being processed by Paystack.',
    payload: {
      payoutId: payout._id.toString(),
      groupId: group._id.toString(),
      cycleId: payout.cycle.toString(),
      recipientId: payout.recipient.toString(),
      amount: payout.amount,
      status: payout.status,
      transferReference: payout.transferReference
    }
  });

  if (advance.nextCycle) {
    await notifyGroupMembers({
      group,
      type: 'cycle_started',
      eventName: 'cycle:started',
      title: 'Next cycle started',
      message: `Cycle ${advance.nextCycle.cycleNumber} has started.`,
      payload: {
        groupId: group._id.toString(),
        cycleId: advance.nextCycle.id,
        cycleNumber: advance.nextCycle.cycleNumber,
        recipientId: advance.nextCycle.recipient,
        dueDate: advance.nextCycle.dueDate
      }
    });
  }

  return {
    payout: serializePayout(payout),
    transfer,
    ...advance,
    alreadyProcessed: false
  };
};

export const rejectPayout = async (adminId: string, payoutId: string, notes: string) => {
  const payout = await PayoutModel.findById(payoutId);
  if (!payout) throw notFound('Payout not found.');

  if (payout.status !== 'pending') {
    throw badRequest('Only pending payouts can be rejected.');
  }

  const group = await getGroupOrThrow(payout.group.toString());
  assertAdmin(group, adminId);

  payout.status = 'rejected';
  payout.notes = notes;
  payout.processedAt = new Date();
  payout.processedBy = toObjectId(adminId);
  await payout.save();

  await notifyGroupMembers({
    group,
    type: 'payout_rejected',
    eventName: 'payout:rejected',
    title: 'Payout rejected',
    message: 'The payout request was rejected by the group admin.',
    payload: {
      payoutId: payout._id.toString(),
      groupId: group._id.toString(),
      cycleId: payout.cycle.toString(),
      recipientId: payout.recipient.toString(),
      reason: notes
    }
  });

  return serializePayout(payout);
};

export const getPayout = async (userId: string, payoutId: string) => {
  const payout = await PayoutModel.findById(payoutId);
  if (!payout) throw notFound('Payout not found.');

  const group = await getGroupOrThrow(payout.group.toString());
  assertMember(group, userId);

  return serializePayout(payout);
};

export const listGroupPayouts = async (userId: string, groupId: string, query: PayoutPaginationQuery) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    PayoutModel.find({ group: group._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    PayoutModel.countDocuments({ group: group._id })
  ]);

  return {
    payouts: items.map(serializePayout),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};
