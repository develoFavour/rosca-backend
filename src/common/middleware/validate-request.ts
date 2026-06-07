import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodObject, ZodRawShape } from 'zod';
import { badRequest } from '../http/api-error';

export const validateRequest = (schema: ZodObject<ZodRawShape>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue: ZodError['issues'][number]) => ({
        path: issue.path.join('.'),
        message: issue.message
      }));

      next(badRequest('Validation failed', details));
      return;
    }

    req.validated = parsed.data;
    next();
  };
