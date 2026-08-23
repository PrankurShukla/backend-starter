import { ErrorCode } from '../constants/errorCodes';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode = 500,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    public readonly details?: unknown,
    public readonly isOperational = true,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(message, 404, ErrorCode.RESOURCE_NOT_FOUND, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, ErrorCode.CONFLICT, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, ErrorCode.UNAUTHENTICATED);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, ErrorCode.FORBIDDEN);
  }
}
