import type { Response } from 'express';

type Meta = Record<string, unknown>;

export const sendSuccess = <TData>(
  res: Response,
  statusCode: number,
  message: string,
  data?: TData,
  meta?: Meta
): Response => {
  const body: {
    success: true;
    message: string;
    data?: TData;
    meta?: Meta;
  } = {
    success: true,
    message
  };

  if (data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;

  return res.status(statusCode).json(body);
};
