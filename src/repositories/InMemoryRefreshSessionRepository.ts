import type { IRefreshSessionRepository, RefreshSessionRecord } from './IRefreshSessionRepository';

interface StoredSession extends RefreshSessionRecord {
  revokedAt: Date | null;
}

export class InMemoryRefreshSessionRepository implements IRefreshSessionRepository {
  private readonly sessions = new Map<string, StoredSession>();

  create(session: RefreshSessionRecord): Promise<void> {
    this.sessions.set(session.tokenHash, { ...session, revokedAt: null });
    return Promise.resolve();
  }

  consume(tokenHash: string, now: Date): Promise<boolean> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= now) return Promise.resolve(false);
    session.revokedAt = now;
    return Promise.resolve(true);
  }

  revoke(tokenHash: string): Promise<void> {
    const session = this.sessions.get(tokenHash);
    if (session && !session.revokedAt) session.revokedAt = new Date();
    return Promise.resolve();
  }

  revokeAllForUser(userId: string): Promise<void> {
    const now = new Date();
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = now;
    }
    return Promise.resolve();
  }

  deleteExpired(before: Date): Promise<number> {
    let removed = 0;
    for (const [tokenHash, session] of this.sessions.entries()) {
      if (session.expiresAt < before) {
        this.sessions.delete(tokenHash);
        removed += 1;
      }
    }
    return Promise.resolve(removed);
  }
}
