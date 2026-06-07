import jwt from 'jsonwebtoken';
import type { Secret, SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

export type AccessTokenPayload = {
  userId: string;
  role: 'user' | 'admin';
};

export type RefreshTokenPayload = {
  userId: string;
  tokenVersion: number;
};

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.jwtAccessSecret as Secret, {
    expiresIn: env.jwtAccessExpiresIn as SignOptions['expiresIn']
  });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.jwtRefreshSecret as Secret, {
    expiresIn: env.jwtRefreshExpiresIn as SignOptions['expiresIn']
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
