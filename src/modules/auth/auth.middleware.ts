import type { NextFunction, Request, Response } from 'express';
import { forbidden, unauthorized } from '../../common/http/api-error';
import { verifyAccessToken } from '../../common/utils/jwt';
import { UserModel } from './user.model';

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('authorization');
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    next(unauthorized('Bearer access token is required.'));
    return;
  }

  try {
    req.auth = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Invalid or expired access token.'));
  }
};

export const requireVerifiedUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  if (!req.auth?.userId) {
    next(unauthorized('Authentication required.'));
    return;
  }

  const user = await UserModel.findById(req.auth.userId).select('isVerified');

  if (!user) {
    next(unauthorized('Authenticated user no longer exists.'));
    return;
  }

  if (!user.isVerified) {
    next(forbidden('Please verify your account before using group features.'));
    return;
  }

  next();
};
