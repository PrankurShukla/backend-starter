import type { ErrorCode } from '../constants/errorCodes';
import type { TokenPayload } from '../providers/auth/IAuthProviders';

declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
    interface Response {
      success<T>(data: T, message?: string, statusCode?: number): Response;
      fail(message: string, statusCode?: number, code?: ErrorCode, details?: unknown): Response;
    }
  }
}

export {};
