import type { RequestHandler } from 'express';
import { ErrorCode } from '../constants/errorCodes';

function meta(requestId: string) {
  return { requestId, timestamp: new Date().toISOString() };
}

export const apiResponse: RequestHandler = (_req, res, next) => {
  res.success = (data, message = 'Request completed successfully', statusCode = 200) =>
    res.status(statusCode).json({
      success: true,
      message,
      data,
      meta: meta(res.locals.requestId),
    });

  res.fail = (message, statusCode = 500, code = ErrorCode.INTERNAL_ERROR, details) =>
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
      meta: meta(res.locals.requestId),
    });

  next();
};
