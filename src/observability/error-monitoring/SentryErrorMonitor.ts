import * as Sentry from '@sentry/node';
import { config } from '../../config/environment';
import type { ErrorMonitorContext, IErrorMonitor } from './IErrorMonitor';

export class SentryErrorMonitor implements IErrorMonitor {
  constructor() {
    Sentry.init({
      dsn: config.SENTRY_DSN,
      environment: config.NODE_ENV,
      release: `${config.SERVICE_NAME}@${config.SERVICE_VERSION}`,
      tracesSampleRate: config.SENTRY_TRACES_SAMPLE_RATE,
      sendDefaultPii: false,
    });
  }

  captureException(error: unknown, context: ErrorMonitorContext = {}): void {
    Sentry.withScope(scope => {
      if (context.requestId) scope.setTag('requestId', context.requestId);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.tenantId) scope.setTag('tenantId', context.tenantId);
      if (context.tags) scope.setTags(context.tags);
      if (context.extra) scope.setExtras(context.extra);
      Sentry.captureException(error);
    });
  }

  captureMessage(message: string, context: ErrorMonitorContext = {}): void {
    Sentry.withScope(scope => {
      if (context.requestId) scope.setTag('requestId', context.requestId);
      if (context.tags) scope.setTags(context.tags);
      if (context.extra) scope.setExtras(context.extra);
      Sentry.captureMessage(message);
    });
  }

  flush(timeoutMs = 2_000): Promise<boolean> {
    return Sentry.flush(timeoutMs);
  }
}
