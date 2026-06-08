import type { NextFunction, Request, Response } from 'express';
import type { ZodError, ZodObject, ZodRawShape } from 'zod';
import { badRequest } from '../http/api-error';

export const validateRequest = (schema: ZodObject<ZodRawShape>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const schemaShape = schema.shape;
    const requestInput: Record<string, unknown> = {};

    if ('body' in schemaShape) requestInput.body = req.body;
    if ('params' in schemaShape) requestInput.params = req.params;
    if ('query' in schemaShape) requestInput.query = req.query;

    const parsed = schema.safeParse(requestInput);

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
