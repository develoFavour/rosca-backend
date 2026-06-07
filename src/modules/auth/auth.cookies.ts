import type { Response } from 'express';
import { env } from '../../config/env';

export const REFRESH_TOKEN_COOKIE = 'ajosave_refresh';

export const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    signed: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

export const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'strict',
    signed: true
  });
};
