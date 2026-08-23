import type { ErrorCode } from '../constants/errorCodes';

export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

export interface SuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta: ResponseMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
  meta: ResponseMeta;
}
