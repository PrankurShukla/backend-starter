import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaHealthCheck } from '../src/infrastructure/database/prisma/PrismaHealthCheck';
import { PrismaRefreshSessionRepository } from '../src/infrastructure/database/prisma/PrismaRefreshSessionRepository';
import { PrismaUserRepository } from '../src/infrastructure/database/prisma/PrismaUserRepository';
import type { PrismaDatabase } from '../src/infrastructure/database/prisma/PrismaDatabase';

const user = {
  id: '82d59892-d605-4cd8-985c-a2217459508e',
  email: 'user@example.com',
  firstName: 'Example',
  lastName: 'User',
  passwordHash: 'hash',
  roles: ['USER'],
  status: 'ACTIVE' as const,
  createdAt: new Date(),
};

describe('Prisma repository adapters', () => {
  it('maps user repository operations to the Prisma client', async () => {
    const findUnique = vi.fn().mockResolvedValue(user);
    const create = vi.fn().mockResolvedValue(user);
    const prisma = { user: { findUnique, create } } as unknown as PrismaClient;
    const repository = new PrismaUserRepository(prisma);

    await expect(repository.findById(user.id)).resolves.toEqual(user);
    await expect(repository.findByEmail(user.email)).resolves.toEqual(user);
    await expect(repository.findCredentialsByEmail(user.email)).resolves.toEqual(user);
    await expect(repository.create({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      passwordHash: user.passwordHash,
      roles: user.roles,
    })).resolves.toEqual(user);
    expect(findUnique).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledOnce();
  });

  it('atomically manages persistent refresh sessions', async () => {
    const create = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = { refreshSession: { create, updateMany, deleteMany } } as unknown as PrismaClient;
    const repository = new PrismaRefreshSessionRepository(prisma);
    const session = {
      id: user.id,
      userId: user.id,
      tokenHash: 'a'.repeat(64),
      expiresAt: new Date(Date.now() + 60_000),
    };

    await repository.create(session);
    await expect(repository.consume(session.tokenHash, new Date())).resolves.toBe(true);
    await repository.revoke(session.tokenHash);
    await repository.revokeAllForUser(session.userId);
    await expect(repository.deleteExpired(new Date())).resolves.toBe(2);
    expect(updateMany).toHaveBeenCalledTimes(3);
  });

  it('delegates readiness to the owned Prisma database', async () => {
    const check = vi.fn().mockResolvedValue(undefined);
    const health = new PrismaHealthCheck({ check } as unknown as PrismaDatabase);
    await health.check();
    expect(health.name).toBe('postgresql');
    expect(check).toHaveBeenCalledOnce();
  });
});
