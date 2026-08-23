import type { ErrorCode } from '../constants/errorCodes';

declare global {
  namespace Express {
    interface Response {
      success<T>(data: T, message?: string, statusCode?: number): Response;
      fail(message: string, statusCode?: number, code?: ErrorCode, details?: unknown): Response;
    }
  }
}

export {};
