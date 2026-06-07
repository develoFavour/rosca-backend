import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

export const createGroupSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional(),
    contributionAmount: z.number().positive(),
    frequency: z.enum(['daily', 'weekly', 'monthly']),
    maxMembers: z.number().int().min(2).max(100),
    rotationOrder: z.enum(['sequential', 'random', 'bidding']).default('sequential')
  })
});

export const updateGroupSchema = z.object({
  params: z.object({
    groupId: objectId
  }),
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    contributionAmount: z.number().positive().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    maxMembers: z.number().int().min(2).max(100).optional(),
    rotationOrder: z.enum(['sequential', 'random', 'bidding']).optional()
  }).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required'
  })
});

export const groupIdParamSchema = z.object({
  params: z.object({
    groupId: objectId
  })
});

export const joinGroupSchema = z.object({
  body: z.object({
    inviteCode: z.string().trim().min(6).max(12).transform((value) => value.toUpperCase())
  })
});

export const activityQuerySchema = z.object({
  params: z.object({
    groupId: objectId
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  })
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>['body'];
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>['body'];
export type GroupIdParams = z.infer<typeof groupIdParamSchema>['params'];
export type JoinGroupInput = z.infer<typeof joinGroupSchema>['body'];
export type ActivityQuery = z.infer<typeof activityQuerySchema>['query'];
