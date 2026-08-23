import { config } from '../config/environment';
import { logger } from '../config/logger';
import { createEmailProvider } from '../infrastructure/email/createEmailProvider';
import { SEND_EMAIL_JOB } from '../infrastructure/email/QueuedEmailProvider';
import { BullMqWorkerRuntime } from '../infrastructure/queue/BullMqWorkerRuntime';
import { JobHandlerRegistry } from '../infrastructure/queue/JobHandlerRegistry';
import { createRedisConnection } from '../infrastructure/redis/RedisConnection';
import { startTelemetry, stopTelemetry } from '../observability/tracing';
import type { EmailMessage } from '../providers/email/IEmailProvider';
import { ShutdownRegistry } from '../shutdown/ShutdownRegistry';

async function startWorker(): Promise<void> {
  if (config.QUEUE_PROVIDER !== 'bullmq') throw new Error('The background worker requires QUEUE_PROVIDER=bullmq');
  await startTelemetry();

  const shutdown = new ShutdownRegistry(logger);
  const redis = createRedisConnection(config.REDIS_URL, logger);
  const email = createEmailProvider(config, logger);
  const handlers = new JobHandlerRegistry();
  handlers.register<EmailMessage>(SEND_EMAIL_JOB, async message => { await email.send(message); });

  const worker = new BullMqWorkerRuntime(config.QUEUE_NAME, redis, config.WORKER_CONCURRENCY, handlers, logger);
  shutdown.register({ name: 'worker', priority: 30, close: () => worker.close() });
  shutdown.register({
    name: 'redis',
    priority: 20,
    close: async () => { if (redis.status === 'ready') await redis.quit(); else redis.disconnect(); },
  });
  if (email.close) shutdown.register({ name: 'email', priority: 15, close: () => { email.close?.(); } });
  shutdown.register({ name: 'opentelemetry', priority: 10, close: stopTelemetry });

  let closing: Promise<void> | undefined;
  const close = (signal: string, error?: unknown): Promise<void> => {
    closing ??= (async () => {
      logger.info({ signal }, 'Background worker shutdown started');
      try {
        await shutdown.closeAll();
        if (error) process.exitCode = 1;
      } catch (shutdownError) {
        process.exitCode = 1;
        logger.error({ err: shutdownError }, 'Background worker shutdown failed');
      }
    })();
    return closing;
  };

  process.once('SIGTERM', () => void close('SIGTERM'));
  process.once('SIGINT', () => void close('SIGINT'));
  process.on('unhandledRejection', error => logger.error({ err: error }, 'Worker unhandled rejection'));
  process.once('uncaughtException', error => {
    logger.fatal({ err: error }, 'Worker uncaught exception');
    void close('uncaughtException', error);
  });

  await worker.waitUntilReady();
  logger.info({ concurrency: config.WORKER_CONCURRENCY, queue: config.QUEUE_NAME }, 'Background worker ready');
}

startWorker().catch(error => {
  logger.fatal({ err: error }, 'Background worker bootstrap failed');
  process.exitCode = 1;
});
