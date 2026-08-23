import type { IHealthCheck } from '../../../providers/health/IHealthCheck';
import type { PrismaDatabase } from './PrismaDatabase';

export class PrismaHealthCheck implements IHealthCheck {
  readonly name = 'postgresql';

  constructor(private readonly database: PrismaDatabase) {}

  check(): Promise<void> {
    return this.database.check();
  }
}
