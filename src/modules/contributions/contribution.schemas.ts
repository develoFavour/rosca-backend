import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

export const initializeContributionPaymentSchema = z.object({
  body: z.object({
    groupId: objectId
  })
});

export const verifyContributionPaymentSchema = z.object({
  body: z.object({
    reference: z.string().trim().min(8).max(120)
  })
});

export const groupIdParamSchema = z.object({
  params: z.object({
    groupId: objectId
  })
});

export const cycleIdParamSchema = z.object({
  params: z.object({
    cycleId: objectId
  })
});

export const contributionIdParamSchema = z.object({
  params: z.object({
    contribId: objectId
  })
});

export const paginatedGroupContributionsSchema = z.object({
  params: z.object({
    groupId: objectId
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export type InitializeContributionPaymentInput = z.infer<typeof initializeContributionPaymentSchema>['body'];
export type VerifyContributionPaymentInput = z.infer<typeof verifyContributionPaymentSchema>['body'];
export type GroupIdParams = z.infer<typeof groupIdParamSchema>['params'];
export type CycleIdParams = z.infer<typeof cycleIdParamSchema>['params'];
export type ContributionIdParams = z.infer<typeof contributionIdParamSchema>['params'];
export type PaginatedQuery = z.infer<typeof paginatedGroupContributionsSchema>['query'];
