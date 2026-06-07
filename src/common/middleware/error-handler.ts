import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../http/api-error';
import { logger } from '../../config/logger';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

export const errorHandler = (
  err: Error & { statusCode?: number; details?: unknown; isOperational?: boolean },
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  const statusCode = err.statusCode || 500;
  const isOperational = Boolean(err.isOperational);

  if (!isOperational) {
    logger.error({ err }, 'Unhandled application error');
  }

  const payload: {
    success: false;
    message: string;
    details?: unknown;
    stack?: string;
    debugMessage?: string;
  } = {
    success: false,
    message: isOperational ? err.message : 'Internal server error'
  };

  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
    if (!isOperational) payload.debugMessage = err.message;
  }

  return res.status(statusCode).json(payload);
};
