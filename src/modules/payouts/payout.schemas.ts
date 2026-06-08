import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

export const requestPayoutSchema = z.object({
  body: z.object({
    groupId: objectId
  }).strict()
}).strict();

export const payoutIdParamSchema = z.object({
  params: z.object({
    payoutId: objectId
  }).strict()
}).strict();

export const groupPayoutsSchema = z.object({
  params: z.object({
    groupId: objectId
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }).strict()
}).strict();

export const rejectPayoutSchema = z.object({
  params: z.object({
    payoutId: objectId
  }),
  body: z.object({
    notes: z.string().trim().min(2).max(500)
  }).strict()
}).strict();

export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>['body'];
export type PayoutIdParams = z.infer<typeof payoutIdParamSchema>['params'];
export type GroupPayoutsParams = z.infer<typeof groupPayoutsSchema>['params'];
export type PayoutPaginationQuery = z.infer<typeof groupPayoutsSchema>['query'];
export type RejectPayoutInput = z.infer<typeof rejectPayoutSchema>['body'];
