import { PrismaClient } from '@prisma/client';

export class PrismaDatabase {
  readonly client: PrismaClient;
  private closed = false;

  constructor(connectionString: string, poolMax: number) {
    const databaseUrl = new URL(connectionString);
    if (!databaseUrl.searchParams.has('connection_limit')) {
      databaseUrl.searchParams.set('connection_limit', String(poolMax));
    }
    this.client = new PrismaClient({ datasourceUrl: databaseUrl.toString() });
  }

  async check(): Promise<void> {
    await this.client.$queryRaw`SELECT 1`;
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    await this.client.$disconnect();
  }
}
