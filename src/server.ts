import { createServer, type Server } from 'node:http';
import { createApp } from './app';
import { createContainer } from './bootstrap/container';
import { config } from './config/environment';
import { logger } from './config/logger';
import { stopTelemetry } from './observability/tracing';

function closeHttpServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve());
    server.closeIdleConnections();
  });
}

export async function startServer(): Promise<Server> {
  const container = createContainer();
  const app = createApp({ container });
  const server = createServer(app);
  let shutdownPromise: Promise<void> | undefined;

  container.shutdown.register({ name: 'opentelemetry', priority: 5, close: stopTelemetry });

  const shutdown = (signal: string, fatalError?: unknown): Promise<void> => {
    if (shutdownPromise) return shutdownPromise;

    shutdownPromise = (async () => {
      logger.info({ signal }, 'Graceful shutdown started');
      const timeout = setTimeout(() => {
        logger.fatal({ signal }, 'Graceful shutdown timed out');
        process.exitCode = 1;
        server.closeAllConnections();
      }, config.SHUTDOWN_TIMEOUT_MS);
      timeout.unref();

      try {
        await closeHttpServer(server);
        await container.shutdown.closeAll();
        if (fatalError) process.exitCode = 1;
        logger.info({ signal }, 'Graceful shutdown completed');
      } catch (error) {
        process.exitCode = 1;
        logger.error({ err: error, signal }, 'Graceful shutdown failed');
      } finally {
        clearTimeout(timeout);
      }
    })();

    return shutdownPromise;
  };

  process.once('SIGTERM', () => void shutdown('SIGTERM'));
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', error => {
    container.errorMonitor.captureException(error, { tags: { source: 'unhandledRejection' } });
    logger.error({ err: error }, 'Unhandled promise rejection');
  });
  process.once('uncaughtException', error => {
    container.errorMonitor.captureException(error, { tags: { source: 'uncaughtException' } });
    logger.fatal({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException', error);
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.PORT, () => {
      server.off('error', reject);
      logger.info({ port: config.PORT }, `${config.SERVICE_NAME} is ready`);
      resolve();
    });
  });

  return server;
}
