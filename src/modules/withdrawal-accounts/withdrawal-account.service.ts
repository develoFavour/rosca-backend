import { Types } from 'mongoose';
import { notFound } from '../../common/http/api-error';
import {
  createPaystackTransferRecipient,
  listPaystackBanks,
  resolvePaystackAccountNumber
} from '../../integrations/paystack/paystack.client';
import { WithdrawalAccountModel, type WithdrawalAccountDocument } from './withdrawal-account.model';
import type { CreateWithdrawalAccountInput, ResolveWithdrawalAccountInput } from './withdrawal-account.schemas';

const toObjectId = (id: string): Types.ObjectId => new Types.ObjectId(id);

export const serializeWithdrawalAccount = (account: WithdrawalAccountDocument) => ({
  id: account._id.toString(),
  user: account.user.toString(),
  provider: account.provider,
  bankCode: account.bankCode,
  bankName: account.bankName,
  accountNumberLast4: account.accountNumberLast4,
  accountName: account.accountName,
  recipientCode: account.recipientCode,
  currency: account.currency,
  isDefault: account.isDefault,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt
});

export const listBanks = async () => {
  const banks = await listPaystackBanks();

  return banks
    .filter((bank) => bank.active !== false)
    .map((bank) => ({
      name: bank.name,
      code: bank.code,
      slug: bank.slug,
      supportsTransfer: bank.supports_transfer,
      currency: bank.currency
    }));
};

export const resolveWithdrawalAccount = async (input: ResolveWithdrawalAccountInput) => {
  const resolved = await resolvePaystackAccountNumber(input.accountNumber, input.bankCode);

  return {
    accountNumber: resolved.account_number,
    accountName: resolved.account_name,
    bankId: resolved.bank_id
  };
};

export const createWithdrawalAccount = async (userId: string, input: CreateWithdrawalAccountInput) => {
  const resolved = await resolvePaystackAccountNumber(input.accountNumber, input.bankCode);
  const recipient = await createPaystackTransferRecipient({
    name: resolved.account_name,
    accountNumber: resolved.account_number,
    bankCode: input.bankCode,
    currency: 'NGN',
    description: 'AjoSave payout withdrawal account'
  });

  await WithdrawalAccountModel.updateMany({
    user: userId
  }, {
    $set: { isDefault: false }
  });

  const account = await WithdrawalAccountModel.create({
    user: toObjectId(userId),
    provider: 'paystack',
    bankCode: input.bankCode,
    bankName: input.bankName,
    accountNumberLast4: resolved.account_number.slice(-4),
    accountName: resolved.account_name,
    recipientCode: recipient.recipient_code,
    currency: 'NGN',
    isDefault: true
  });

  return serializeWithdrawalAccount(account);
};

export const getMyWithdrawalAccount = async (userId: string) => {
  const account = await WithdrawalAccountModel.findOne({
    user: userId,
    isDefault: true
  }).sort({ createdAt: -1 });

  if (!account) throw notFound('No default withdrawal account found.');

  return serializeWithdrawalAccount(account);
};

export const getDefaultWithdrawalAccountDocument = async (userId: string): Promise<WithdrawalAccountDocument> => {
  const account = await WithdrawalAccountModel.findOne({
    user: userId,
    isDefault: true
  }).sort({ createdAt: -1 });

  if (!account) throw notFound('Recipient does not have a default withdrawal account.');

  return account;
};
