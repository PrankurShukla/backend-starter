import type { IHealthCheck, HealthCheckResult } from '../providers/health/IHealthCheck';

export class HealthService {
  constructor(private readonly checks: IHealthCheck[] = []) {}

  async readiness() {
    const results = await Promise.all(this.checks.map(check => this.runCheck(check)));
    return {
      ready: results.every(result => result.healthy),
      checks: results,
    };
  }

  private async runCheck(check: IHealthCheck): Promise<HealthCheckResult> {
    const startedAt = performance.now();
    try {
      await check.check();
      return { name: check.name, healthy: true, durationMs: performance.now() - startedAt };
    } catch (error) {
      return {
        name: check.name,
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown dependency error',
        durationMs: performance.now() - startedAt,
      };
    }
  }
}
