import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../constants/errorCodes';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = error instanceof AppError
    ? error
    : new AppError('An unexpected error occurred', 500, ErrorCode.INTERNAL_ERROR, undefined, false);

  const logContext = {
    requestId: res.locals.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode: appError.statusCode,
    errorCode: appError.code,
    err: error,
  };

  if (appError.statusCode >= 500) logger.error(logContext, appError.message);
  else logger.warn(logContext, appError.message);

  const safeDetails = config.NODE_ENV === 'production' && appError.statusCode >= 500
    ? undefined
    : appError.details;

  res.fail(appError.message, appError.statusCode, appError.code, safeDetails);
};
