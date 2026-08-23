import type { RequestHandler } from 'express';
import { NotFoundError } from '../errors/AppError';

export const notFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} was not found`));
};
