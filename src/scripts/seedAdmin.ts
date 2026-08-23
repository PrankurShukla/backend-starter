import { config } from '../config/environment';
import { logger } from '../config/logger';
import { ScryptPasswordHasher } from '../infrastructure/auth/ScryptPasswordHasher';
import { PrismaDatabase } from '../infrastructure/database/prisma/PrismaDatabase';

async function seedAdmin(): Promise<void> {
  if (config.DATABASE_PROVIDER !== 'prisma') throw new Error('Admin seeding requires DATABASE_PROVIDER=prisma');
  if (!config.BOOTSTRAP_ADMIN_EMAIL || config.BOOTSTRAP_ADMIN_PASSWORD.length < 12) {
    throw new Error('BOOTSTRAP_ADMIN_EMAIL and a password of at least 12 characters are required');
  }

  const database = new PrismaDatabase(config.DATABASE_URL, config.DATABASE_POOL_MAX);
  try {
    const hasher = new ScryptPasswordHasher(config.PASSWORD_SCRYPT_COST);
    const passwordHash = await hasher.hash(config.BOOTSTRAP_ADMIN_PASSWORD);
    const existing = await database.client.user.findUnique({ where: { email: config.BOOTSTRAP_ADMIN_EMAIL } });
    const roles = [...new Set([...(existing?.roles ?? []), 'ADMIN'])];
    const user = existing
      ? await database.client.user.update({
        where: { id: existing.id },
        data: { passwordHash, roles, status: 'ACTIVE' },
      })
      : await database.client.user.create({
        data: {
          email: config.BOOTSTRAP_ADMIN_EMAIL,
          firstName: config.BOOTSTRAP_ADMIN_FIRST_NAME,
          lastName: config.BOOTSTRAP_ADMIN_LAST_NAME,
          passwordHash,
          roles,
        },
      });
    logger.info({ userId: user.id }, 'Bootstrap administrator is ready');
  } finally {
    await database.close();
  }
}

seedAdmin().catch(error => {
  logger.fatal({ err: error }, 'Failed to seed bootstrap administrator');
  process.exitCode = 1;
});
