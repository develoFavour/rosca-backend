import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../common/http/api-error';
import { initializePaystackTransaction, verifyPaystackTransaction } from '../../integrations/paystack/paystack.client';
import type { PaystackVerifyTransactionData } from '../../integrations/paystack/paystack.types';
import { UserModel } from '../auth/user.model';
import { closeCycleIfFullyPaid, getCurrentCycleForGroup, serializeCycle } from '../cycles/cycle.service';
import { CycleModel, type CycleDocument } from '../cycles/cycle.model';
import { GroupModel, type GroupDocument } from '../groups/group.model';
import { PaymentTransactionModel, type PaymentTransactionDocument } from '../payments/payment-transaction.model';
import { ContributionModel, type ContributionDocument } from './contribution.model';
import type { PaginatedQuery } from './contribution.schemas';

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

const isMember = (group: GroupDocument, userId: string): boolean =>
  group.members.some((member) => member.user.toString() === userId);

const isAdmin = (group: GroupDocument, userId: string): boolean => group.admin.toString() === userId;

const assertMember = (group: GroupDocument, userId: string): void => {
  if (!isMember(group, userId)) {
    throw forbidden('You must be a group member to access contributions.');
  }
};

const assertAdmin = (group: GroupDocument, userId: string): void => {
  if (!isAdmin(group, userId)) {
    throw forbidden('Only the group admin can perform this action.');
  }
};

const getGroupOrThrow = async (groupId: string): Promise<GroupDocument> => {
  const group = await GroupModel.findOne({
    _id: groupId,
    status: { $ne: 'deleted' }
  });

  if (!group) throw notFound('Group not found.');
  return group;
};

const serializeContribution = (contribution: ContributionDocument) => ({
  id: contribution._id.toString(),
  group: contribution.group.toString(),
  cycle: contribution.cycle.toString(),
  member: contribution.member.toString(),
  amount: contribution.amount,
  status: contribution.status,
  paidAt: contribution.paidAt,
  latePenalty: contribution.latePenalty,
  reference: contribution.reference,
  confirmedBy: contribution.confirmedBy?.toString(),
  createdAt: contribution.createdAt,
  updatedAt: contribution.updatedAt
});

const serializePayment = (payment: PaymentTransactionDocument) => ({
  id: payment._id.toString(),
  reference: payment.reference,
  authorizationUrl: payment.authorizationUrl,
  accessCode: payment.accessCode,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  providerStatus: payment.providerStatus,
  contribution: payment.contribution?.toString()
});

const generatePaymentReference = (groupId: string, cycleId: string, userId: string): string => {
  const suffix = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `AJO-${groupId.slice(-6)}-${cycleId.slice(-6)}-${userId.slice(-6)}-${suffix}`;
};

const assertCanContribute = async (group: GroupDocument, cycle: CycleDocument, userId: string): Promise<void> => {
  if (group.status !== 'active') {
    throw badRequest('Contributions can only be made to active groups.');
  }

  if (cycle.status !== 'open') {
    throw badRequest('This cycle is not open for contributions.');
  }

  const existingContribution = await ContributionModel.exists({
    cycle: cycle._id,
    member: userId
  });

  if (existingContribution) {
    throw conflict('You have already contributed for this cycle.');
  }
};

const markPaymentFromProviderStatus = (status: PaystackVerifyTransactionData['status']) => {
  if (status === 'success') return 'success' as const;
  if (status === 'failed') return 'failed' as const;
  if (status === 'abandoned') return 'abandoned' as const;
  return 'pending' as const;
};

export const initializeContributionPayment = async (userId: string, groupId: string) => {
  const [group, user] = await Promise.all([
    getGroupOrThrow(groupId),
    UserModel.findById(userId)
  ]);

  if (!user) throw notFound('User not found.');
  assertMember(group, userId);

  const cycle = await getCurrentCycleForGroup(groupId);
  await assertCanContribute(group, cycle, userId);

  const reference = generatePaymentReference(group._id.toString(), cycle._id.toString(), userId);
  const amountKobo = group.contributionAmount * 100;

  const initialized = await initializePaystackTransaction({
    email: user.email,
    amountKobo,
    reference,
    metadata: {
      purpose: 'contribution',
      userId,
      groupId: group._id.toString(),
      cycleId: cycle._id.toString()
    },
    channels: ['card', 'bank', 'ussd', 'bank_transfer']
  });

  const payment = await PaymentTransactionModel.create({
    user: toObjectId(userId),
    group: group._id,
    cycle: cycle._id,
    purpose: 'contribution',
    provider: 'paystack',
    reference,
    accessCode: initialized.access_code,
    authorizationUrl: initialized.authorization_url,
    amount: group.contributionAmount,
    currency: 'NGN',
    status: 'initialized'
  });

  return {
    payment: serializePayment(payment),
    cycle: serializeCycle(cycle)
  };
};

export const fulfillContributionPayment = async (reference: string, providerData?: PaystackVerifyTransactionData) => {
  const payment = await PaymentTransactionModel.findOne({ reference });
  if (!payment) throw notFound('Payment transaction not found.');

  if (payment.status === 'success' && payment.contribution) {
    const contribution = await ContributionModel.findById(payment.contribution);
    return {
      payment: serializePayment(payment),
      contribution: contribution ? serializeContribution(contribution) : undefined,
      alreadyFulfilled: true
    };
  }

  const transaction = providerData ?? await verifyPaystackTransaction(reference);
  payment.providerStatus = transaction.status;
  payment.providerResponse = transaction as unknown as Record<string, unknown>;
  payment.status = markPaymentFromProviderStatus(transaction.status);

  if (transaction.status !== 'success') {
    await payment.save();
    throw badRequest(`Payment is not successful. Current status: ${transaction.status}`);
  }

  if (transaction.amount !== payment.amount * 100) {
    payment.status = 'failed';
    await payment.save();
    throw badRequest('Payment amount does not match expected contribution amount.');
  }

  const [group, cycle] = await Promise.all([
    GroupModel.findById(payment.group),
    CycleModel.findById(payment.cycle)
  ]);

  if (!group) throw notFound('Group not found for payment.');
  if (!cycle) throw notFound('Cycle not found for payment.');

  await assertCanContribute(group, cycle, payment.user.toString());

  const paidAt = transaction.paid_at ? new Date(transaction.paid_at) : new Date();
  const status = paidAt.getTime() > cycle.dueDate.getTime() ? 'late' : 'confirmed';

  const contribution = await ContributionModel.create({
    group: payment.group,
    cycle: payment.cycle,
    member: payment.user,
    amount: payment.amount,
    status,
    paidAt,
    reference: payment.reference,
    confirmedBy: payment.user
  });

  payment.status = 'success';
  payment.contribution = contribution._id;
  payment.fulfilledAt = new Date();
  await payment.save();

  cycle.totalCollected += contribution.amount;
  cycle.contributions.push(contribution._id);
  await cycle.save();
  const updatedCycle = await closeCycleIfFullyPaid(cycle);

  return {
    payment: serializePayment(payment),
    contribution: serializeContribution(contribution),
    cycle: serializeCycle(updatedCycle),
    alreadyFulfilled: false
  };
};

export const verifyContributionPayment = async (_userId: string, reference: string) => {
  return fulfillContributionPayment(reference);
};

export const listGroupContributions = async (userId: string, groupId: string, query: PaginatedQuery) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ContributionModel.find({ group: group._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    ContributionModel.countDocuments({ group: group._id })
  ]);

  return {
    contributions: items.map(serializeContribution),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const listCycleContributions = async (userId: string, cycleId: string) => {
  const cycle = await CycleModel.findById(cycleId);
  if (!cycle) throw notFound('Cycle not found.');

  const group = await getGroupOrThrow(cycle.group.toString());
  assertMember(group, userId);

  const contributions = await ContributionModel.find({ cycle: cycle._id }).sort({ createdAt: -1 });
  return contributions.map(serializeContribution);
};

export const listMyContributions = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const contributions = await ContributionModel.find({
    group: group._id,
    member: userId
  }).sort({ createdAt: -1 });

  return contributions.map(serializeContribution);
};

export const getContributionStatus = async (userId: string, groupId: string) => {
  const group = await getGroupOrThrow(groupId);
  assertMember(group, userId);

  const cycle = await getCurrentCycleForGroup(groupId);
  const contributions = await ContributionModel.find({ cycle: cycle._id });
  const paidMemberIds = new Set(contributions.map((contribution) => contribution.member.toString()));

  return {
    cycle: serializeCycle(cycle),
    members: group.members.map((member) => {
      const contribution = contributions.find((item) => item.member.toString() === member.user.toString());

      return {
        user: member.user.toString(),
        slotPosition: member.slotPosition,
        hasPaid: paidMemberIds.has(member.user.toString()),
        contribution: contribution ? serializeContribution(contribution) : undefined
      };
    }),
    summary: {
      paidCount: paidMemberIds.size,
      memberCount: group.members.length,
      totalCollected: cycle.totalCollected,
      totalExpected: cycle.totalExpected,
      status: cycle.status
    }
  };
};

export const confirmContribution = async (userId: string, contributionId: string) => {
  const contribution = await ContributionModel.findById(contributionId);
  if (!contribution) throw notFound('Contribution not found.');

  const group = await getGroupOrThrow(contribution.group.toString());
  assertAdmin(group, userId);

  if (contribution.status === 'confirmed' || contribution.status === 'late') {
    return serializeContribution(contribution);
  }

  contribution.status = 'confirmed';
  contribution.confirmedBy = toObjectId(userId);
  contribution.paidAt = contribution.paidAt ?? new Date();
  await contribution.save();

  const cycle = await CycleModel.findById(contribution.cycle);
  if (cycle) await closeCycleIfFullyPaid(cycle);

  return serializeContribution(contribution);
};
