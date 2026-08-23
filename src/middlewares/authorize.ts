import type { RequestHandler } from 'express';
import { ForbiddenError, UnauthenticatedError } from '../errors/AppError';

export function authorizeRoles(...allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthenticatedError());
      return;
    }
    if (!allowedRoles.some(role => req.auth?.roles?.includes(role))) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}

export function authorizeSelfOrRoles(paramName: string, ...allowedRoles: string[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthenticatedError());
      return;
    }
    if (req.auth.subject === req.params[paramName] || allowedRoles.some(role => req.auth?.roles?.includes(role))) {
      next();
      return;
    }
    next(new ForbiddenError());
  };
}
