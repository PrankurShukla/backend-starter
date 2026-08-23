import type { RequestHandler } from 'express';
import { z, type ZodTypeAny } from 'zod';
import { AppError } from '../errors/AppError';
import { ErrorCode } from '../constants/errorCodes';

export interface RequestSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function validate(schema: RequestSchema): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schema.body) req.body = schema.body.parse(req.body);
      if (schema.query) Object.assign(req.query, schema.query.parse(req.query));
      if (schema.params) Object.assign(req.params, schema.params.parse(req.params));
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        next(new AppError('Request validation failed', 422, ErrorCode.VALIDATION_FAILED, error.flatten()));
        return;
      }
      next(error);
    }
  };
}
