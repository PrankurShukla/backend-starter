import type { RequestHandler } from 'express';
import { UnauthenticatedError } from '../errors/AppError';
import type { ITokenProvider } from '../providers/auth/IAuthProviders';

export function authenticate(tokens: ITokenProvider): RequestHandler {
  return async (req, _res, next) => {
    const authorization = req.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      next(new UnauthenticatedError());
      return;
    }
    try {
      req.auth = await tokens.verifyAccessToken(authorization.slice('Bearer '.length));
      next();
    } catch {
      next(new UnauthenticatedError('Invalid or expired access token'));
    }
  };
}
