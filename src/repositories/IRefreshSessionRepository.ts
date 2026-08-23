export interface RefreshSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface IRefreshSessionRepository {
  create(session: RefreshSessionRecord): Promise<void>;
  consume(tokenHash: string, now: Date): Promise<boolean>;
  revoke(tokenHash: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  deleteExpired(before: Date): Promise<number>;
}
