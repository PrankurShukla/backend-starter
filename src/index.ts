import { createServer, type Server } from 'node:http';
import { createApp } from './app';
import { config } from './config/environment';
import { logger } from './config/logger';

const app = createApp();
const server = createServer(app);

function closeServer(serverToClose: Server, signal: string) {
  logger.info({ signal }, 'Graceful shutdown started');

  const forceShutdown = setTimeout(() => {
    logger.fatal({ signal }, 'Graceful shutdown timed out');
    process.exit(1);
  }, config.SHUTDOWN_TIMEOUT_MS);
  forceShutdown.unref();

  serverToClose.close(error => {
    clearTimeout(forceShutdown);
    if (error) {
      logger.error({ err: error }, 'HTTP server shutdown failed');
      process.exitCode = 1;
    } else {
      logger.info('Graceful shutdown completed');
    }
  });
}

server.listen(config.PORT, () => {
  logger.info({ port: config.PORT }, `${config.SERVICE_NAME} is ready`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => closeServer(server, signal));
}

process.on('unhandledRejection', error => {
  logger.error({ err: error }, 'Unhandled promise rejection');
});

process.on('uncaughtException', error => {
  logger.fatal({ err: error }, 'Uncaught exception');
  closeServer(server, 'uncaughtException');
});

export { createApp } from './app';
export { AppError, NotFoundError, ConflictError, UnauthenticatedError, ForbiddenError } from './errors/AppError';
export { ErrorCode } from './constants/errorCodes';
export type { ICorsPolicy } from './providers/cors/ICorsPolicy';
export type { IEmailProvider, EmailMessage } from './providers/email/IEmailProvider';
export type { IStorageProvider, UploadInput, StoredFile } from './providers/storage/IStorageProvider';
export type { IQueueProvider, QueueJob } from './providers/queue/IQueueProvider';
export type { IPasswordHasher, ITokenProvider, TokenPayload } from './providers/auth/IAuthProviders';
export type { IHealthCheck, HealthCheckResult } from './providers/health/IHealthCheck';
