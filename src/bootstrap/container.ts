import type { IHealthCheck } from '../providers/health/IHealthCheck';
import { HealthService } from '../services/health.service';
import { InMemoryUserRepository } from '../repositories/InMemoryUserRepository';
import { UserService } from '../services/user.service';
import type { IErrorMonitor } from '../observability/error-monitoring';
import { createErrorMonitor } from '../observability/error-monitoring';
import type { IAuditLogger } from '../audit/IAuditLogger';
import { StructuredAuditLogger } from '../audit/StructuredAuditLogger';
import { logger } from '../config/logger';
import { MetricsService } from '../observability/metrics/MetricsService';
import { config } from '../config/environment';
import { ShutdownRegistry } from '../shutdown/ShutdownRegistry';

export interface ContainerOptions {
  healthChecks?: IHealthCheck[];
  errorMonitor?: IErrorMonitor;
  auditLogger?: IAuditLogger;
  metrics?: MetricsService;
}

export function createContainer(options: ContainerOptions = {}) {
  const userRepository = new InMemoryUserRepository();
  const errorMonitor = options.errorMonitor ?? createErrorMonitor();
  const auditLogger = options.auditLogger ?? new StructuredAuditLogger(logger);
  const metrics = options.metrics ?? new MetricsService(config.SERVICE_NAME, config.METRICS_ENABLED);
  const shutdown = new ShutdownRegistry(logger);
  shutdown.register({
    name: 'error-monitor',
    priority: 10,
    close: async () => { await errorMonitor.flush(); },
  });

  return {
    errorMonitor,
    auditLogger,
    metrics,
    shutdown,
    healthService: new HealthService(options.healthChecks ?? []),
    userService: new UserService(userRepository, auditLogger),
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
