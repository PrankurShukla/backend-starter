import type { PrismaClient } from '@prisma/client';
import type { IRefreshSessionRepository, RefreshSessionRecord } from '../../../repositories/IRefreshSessionRepository';

export class PrismaRefreshSessionRepository implements IRefreshSessionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(session: RefreshSessionRecord): Promise<void> {
    await this.prisma.refreshSession.create({ data: session });
  }

  async consume(tokenHash: string, now: Date): Promise<boolean> {
    const result = await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    return result.count === 1;
  }

  async revoke(tokenHash: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.prisma.refreshSession.deleteMany({ where: { expiresAt: { lt: before } } });
    return result.count;
  }
}
