import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../constants/errorCodes';
import { logger } from '../config/logger';
import { config } from '../config/environment';
import type { IErrorMonitor } from '../observability/error-monitoring';
import { NoopErrorMonitor } from '../observability/error-monitoring/NoopErrorMonitor';

export function createErrorHandler(errorMonitor: IErrorMonitor = new NoopErrorMonitor()): ErrorRequestHandler {
  return (error, req, res, _next) => {
    const caught: unknown = error;
    const requestId = typeof res.locals.requestId === 'string' ? res.locals.requestId : 'unknown';
    const appError = caught instanceof AppError
      ? caught
      : new AppError('An unexpected error occurred', 500, ErrorCode.INTERNAL_ERROR, undefined, false);

    const logContext = {
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: appError.statusCode,
      errorCode: appError.code,
      err: caught,
    };

    if (appError.statusCode >= 500) logger.error(logContext, appError.message);
    else logger.warn(logContext, appError.message);

    if (appError.statusCode >= 500) {
      errorMonitor.captureException(caught, {
        requestId,
        tags: { errorCode: appError.code, method: req.method },
        extra: { path: req.originalUrl, statusCode: appError.statusCode },
      });
    }

    const safeDetails = config.NODE_ENV === 'production' && appError.statusCode >= 500
      ? undefined
      : appError.details;

    res.fail(appError.message, appError.statusCode, appError.code, safeDetails);
  };
}
