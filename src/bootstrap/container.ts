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
import type { IUserRepository } from '../repositories/IUserRepository';
import type { IRefreshSessionRepository } from '../repositories/IRefreshSessionRepository';
import { InMemoryRefreshSessionRepository } from '../repositories/InMemoryRefreshSessionRepository';
import { PrismaDatabase } from '../infrastructure/database/prisma/PrismaDatabase';
import { PrismaUserRepository } from '../infrastructure/database/prisma/PrismaUserRepository';
import { PrismaRefreshSessionRepository } from '../infrastructure/database/prisma/PrismaRefreshSessionRepository';
import { PrismaHealthCheck } from '../infrastructure/database/prisma/PrismaHealthCheck';
import { ScryptPasswordHasher } from '../infrastructure/auth/ScryptPasswordHasher';
import { JwtTokenProvider } from '../infrastructure/auth/JwtTokenProvider';
import { AuthService } from '../services/auth.service';
import type { IPasswordHasher, ITokenProvider } from '../providers/auth/IAuthProviders';
import type { IEmailProvider } from '../providers/email/IEmailProvider';
import type { EmailMessage } from '../providers/email/IEmailProvider';
import type { IQueueProvider } from '../providers/queue/IQueueProvider';
import type { IStorageProvider } from '../providers/storage/IStorageProvider';
import { createEmailProvider } from '../infrastructure/email/createEmailProvider';
import { QueuedEmailProvider, SEND_EMAIL_JOB } from '../infrastructure/email/QueuedEmailProvider';
import { JobHandlerRegistry } from '../infrastructure/queue/JobHandlerRegistry';
import { InlineQueueProvider } from '../infrastructure/queue/InlineQueueProvider';
import { BullMqQueueProvider } from '../infrastructure/queue/BullMqQueueProvider';
import { createRedisConnection } from '../infrastructure/redis/RedisConnection';
import { FunctionHealthCheck } from '../providers/health/FunctionHealthCheck';
import { createStorageProvider } from '../infrastructure/storage/createStorageProvider';

function hasCheck(value: IStorageProvider): value is IStorageProvider & { check(): Promise<void> } {
  return 'check' in value && typeof value.check === 'function';
}

function hasDestroy(value: IStorageProvider): value is IStorageProvider & { destroy(): void } {
  return 'destroy' in value && typeof value.destroy === 'function';
}

function hasClose(value: IEmailProvider): value is IEmailProvider & { close(): void } {
  return 'close' in value && typeof value.close === 'function';
}

export interface ContainerOptions {
  healthChecks?: IHealthCheck[];
  errorMonitor?: IErrorMonitor;
  auditLogger?: IAuditLogger;
  metrics?: MetricsService;
  userRepository?: IUserRepository;
  refreshSessionRepository?: IRefreshSessionRepository;
  passwordHasher?: IPasswordHasher;
  tokenProvider?: ITokenProvider;
  emailProvider?: IEmailProvider;
  queueProvider?: IQueueProvider;
  storageProvider?: IStorageProvider;
}

export function createContainer(options: ContainerOptions = {}) {
  const errorMonitor = options.errorMonitor ?? createErrorMonitor();
  const auditLogger = options.auditLogger ?? new StructuredAuditLogger(logger);
  const metrics = options.metrics ?? new MetricsService(config.SERVICE_NAME, config.METRICS_ENABLED);
  const shutdown = new ShutdownRegistry(logger);
  const healthChecks = [...(options.healthChecks ?? [])];
  let database: PrismaDatabase | undefined;
  let userRepository = options.userRepository;
  let refreshSessionRepository = options.refreshSessionRepository;

  if (!userRepository || !refreshSessionRepository) {
    if (config.DATABASE_PROVIDER === 'prisma') {
      database = new PrismaDatabase(config.DATABASE_URL, config.DATABASE_POOL_MAX);
      userRepository ??= new PrismaUserRepository(database.client);
      refreshSessionRepository ??= new PrismaRefreshSessionRepository(database.client);
      healthChecks.push(new PrismaHealthCheck(database));
      shutdown.register({ name: 'postgresql', priority: 30, close: () => database?.close() ?? Promise.resolve() });
    } else {
      userRepository ??= new InMemoryUserRepository();
      refreshSessionRepository ??= new InMemoryRefreshSessionRepository();
    }
  }

  const handlers = new JobHandlerRegistry();
  const deliveryEmailProvider = options.emailProvider ?? createEmailProvider(config, logger);
  handlers.register<EmailMessage>(SEND_EMAIL_JOB, async message => {
    await deliveryEmailProvider.send(message);
  });

  let queueProvider = options.queueProvider;
  if (!queueProvider && config.QUEUE_PROVIDER === 'bullmq') {
    const redis = createRedisConnection(config.REDIS_URL, logger);
    const bullQueue = new BullMqQueueProvider(config.QUEUE_NAME, redis);
    queueProvider = bullQueue;
    healthChecks.push(new FunctionHealthCheck('redis', async () => { await redis.ping(); }));
    shutdown.register({ name: 'bullmq-queue', priority: 25, close: () => bullQueue.close() });
    shutdown.register({
      name: 'redis',
      priority: 20,
      close: async () => { if (redis.status === 'ready') await redis.quit(); else redis.disconnect(); },
    });
  }
  queueProvider ??= new InlineQueueProvider(handlers);

  const emailProvider = config.QUEUE_PROVIDER === 'bullmq'
    ? new QueuedEmailProvider(queueProvider)
    : deliveryEmailProvider;
  const storageProvider = options.storageProvider ?? createStorageProvider(config);
  if (hasCheck(storageProvider)) {
    healthChecks.push(new FunctionHealthCheck('storage', () => storageProvider.check()));
  }
  if (hasDestroy(storageProvider)) {
    shutdown.register({ name: 'storage', priority: 15, close: () => { storageProvider.destroy(); } });
  }
  if (hasClose(deliveryEmailProvider)) {
    shutdown.register({ name: 'email', priority: 15, close: () => { deliveryEmailProvider.close(); } });
  }

  const passwordHasher = options.passwordHasher ?? new ScryptPasswordHasher(config.PASSWORD_SCRYPT_COST);
  const tokenProvider = options.tokenProvider ?? new JwtTokenProvider({
    accessSecret: config.ACCESS_TOKEN_SECRET,
    refreshSecret: config.REFRESH_TOKEN_SECRET,
    accessTtlSeconds: config.ACCESS_TOKEN_TTL_SECONDS,
    refreshTtlSeconds: config.REFRESH_TOKEN_TTL_SECONDS,
    issuer: config.SERVICE_NAME,
  });
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
    database,
    queueProvider,
    emailProvider,
    storageProvider,
    tokenProvider,
    healthService: new HealthService(healthChecks),
    userService: new UserService(userRepository, auditLogger),
    authService: new AuthService(
      userRepository,
      refreshSessionRepository,
      passwordHasher,
      tokenProvider,
      auditLogger,
      config.ACCESS_TOKEN_TTL_SECONDS,
      config.REFRESH_TOKEN_TTL_SECONDS,
    ),
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
