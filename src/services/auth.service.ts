import { createHash, randomUUID } from 'node:crypto';
import type { IAuditLogger } from '../audit/IAuditLogger';
import { ConflictError, UnauthenticatedError } from '../errors/AppError';
import type { LoginDto, RegisterDto } from '../models/auth.dto';
import type { IPasswordHasher, ITokenProvider, TokenPayload } from '../providers/auth/IAuthProviders';
import type { IRefreshSessionRepository } from '../repositories/IRefreshSessionRepository';
import type { IUserRepository } from '../repositories/IUserRepository';
import type { User } from '../types/user';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly sessions: IRefreshSessionRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokens: ITokenProvider,
    private readonly audit: IAuditLogger,
    private readonly accessTokenTtlSeconds: number,
    private readonly refreshTokenTtlSeconds: number,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    if (await this.users.findByEmail(dto.email)) throw new ConflictError('A user with this email already exists');
    const passwordHash = await this.passwordHasher.hash(dto.password);
    const user = await this.users.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      roles: ['USER'],
    });
    await this.audit.record({ action: 'auth.registered', resourceType: 'user', resourceId: user.id, outcome: 'SUCCESS' });
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const credentials = await this.users.findCredentialsByEmail(dto.email);
    const valid = credentials?.passwordHash
      ? await this.passwordHasher.compare(dto.password, credentials.passwordHash)
      : false;
    if (!credentials || !valid || credentials.status !== 'ACTIVE') {
      await this.audit.record({ action: 'auth.login', resourceType: 'user', outcome: 'FAILURE', metadata: { reason: 'invalid_credentials' } });
      throw new UnauthenticatedError('Invalid email or password');
    }
    await this.audit.record({ action: 'auth.login', resourceType: 'user', resourceId: credentials.id, outcome: 'SUCCESS' });
    return this.issueTokens(credentials);
  }

  async refresh(refreshToken: string): Promise<AuthResult> {
    let payload: TokenPayload;
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthenticatedError('Invalid or expired refresh token');
    }
    if (!payload.sessionId || !await this.sessions.consume(hashToken(refreshToken), new Date())) {
      throw new UnauthenticatedError('Invalid or expired refresh token');
    }
    const user = await this.users.findById(payload.subject);
    if (!user || user.status !== 'ACTIVE') throw new UnauthenticatedError('Account is unavailable');
    return this.issueTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.sessions.revoke(hashToken(refreshToken));
  }

  private async issueTokens(user: User): Promise<AuthResult> {
    const sessionId = randomUUID();
    const payload: TokenPayload = { subject: user.id, roles: user.roles };
    const accessToken = await this.tokens.createAccessToken(payload);
    const refreshToken = await this.tokens.createRefreshToken({ ...payload, sessionId });
    await this.sessions.create({
      id: sessionId,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + this.refreshTokenTtlSeconds * 1000),
    });
    return { user, accessToken, refreshToken, tokenType: 'Bearer', expiresIn: this.accessTokenTtlSeconds };
  }
}
