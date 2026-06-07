declare global {
  namespace Express {
    interface Request {
      validated?: unknown;
      rawBody?: Buffer;
      auth?: {
        userId: string;
        role: 'user' | 'admin';
      };
    }
  }
}

export {};
