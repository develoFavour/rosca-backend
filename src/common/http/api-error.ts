export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational = true;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message = 'Invalid request', details?: unknown): ApiError =>
  new ApiError(400, message, details);

export const unauthorized = (message = 'Authentication required'): ApiError =>
  new ApiError(401, message);

export const forbidden = (message = 'You are not allowed to perform this action'): ApiError =>
  new ApiError(403, message);

export const notFound = (message = 'Resource not found'): ApiError =>
  new ApiError(404, message);

export const conflict = (message = 'Resource conflict'): ApiError =>
  new ApiError(409, message);
