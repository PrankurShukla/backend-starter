import { startTelemetry } from './observability/tracing';
import { logger } from './config/logger';

async function bootstrap(): Promise<void> {
  await startTelemetry();
  const { startServer } = await import('./server');
  await startServer();
}

bootstrap().catch(error => {
  logger.fatal({ err: error }, 'Application bootstrap failed');
  process.exitCode = 1;
});
