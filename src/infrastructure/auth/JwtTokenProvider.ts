import { randomUUID } from 'node:crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { ITokenProvider, TokenPayload } from '../../providers/auth/IAuthProviders';

interface TokenOptions {
  accessSecret: string;
  refreshSecret: string;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
  issuer: string;
}

export class JwtTokenProvider implements ITokenProvider {
  constructor(private readonly options: TokenOptions) {}

  createAccessToken(payload: TokenPayload): Promise<string> {
    return Promise.resolve(this.sign(payload, 'access', this.options.accessSecret, this.options.accessTtlSeconds));
  }

  createRefreshToken(payload: TokenPayload): Promise<string> {
    return Promise.resolve(this.sign(payload, 'refresh', this.options.refreshSecret, this.options.refreshTtlSeconds));
  }

  verifyAccessToken(token: string): Promise<TokenPayload> {
    return Promise.resolve().then(() => this.verify(token, 'access', this.options.accessSecret));
  }

  verifyRefreshToken(token: string): Promise<TokenPayload> {
    return Promise.resolve().then(() => this.verify(token, 'refresh', this.options.refreshSecret));
  }

  private sign(payload: TokenPayload, tokenType: 'access' | 'refresh', secret: string, expiresIn: number): string {
    return jwt.sign({
      tokenType,
      roles: payload.roles ?? [],
      ...(payload.tenantId ? { tenantId: payload.tenantId } : {}),
      ...(payload.sessionId ? { sessionId: payload.sessionId } : {}),
    }, secret, {
      subject: payload.subject,
      expiresIn,
      issuer: this.options.issuer,
      audience: this.options.issuer,
      jwtid: randomUUID(),
      algorithm: 'HS256',
    });
  }

  private verify(token: string, expectedType: 'access' | 'refresh', secret: string): TokenPayload {
    const decoded = jwt.verify(token, secret, {
      issuer: this.options.issuer,
      audience: this.options.issuer,
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'string' || decoded.tokenType !== expectedType || !decoded.sub) {
      throw new Error('Invalid token');
    }
    return this.toPayload(decoded);
  }

  private toPayload(decoded: JwtPayload): TokenPayload {
    return {
      subject: decoded.sub as string,
      roles: Array.isArray(decoded.roles) ? decoded.roles.filter((role): role is string => typeof role === 'string') : [],
      ...(typeof decoded.tenantId === 'string' ? { tenantId: decoded.tenantId } : {}),
      ...(typeof decoded.sessionId === 'string' ? { sessionId: decoded.sessionId } : {}),
    };
  }
}
