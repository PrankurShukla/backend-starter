import { config } from '../../config/environment';
import type { IErrorMonitor } from './IErrorMonitor';
import { NoopErrorMonitor } from './NoopErrorMonitor';
import { SentryErrorMonitor } from './SentryErrorMonitor';

export function createErrorMonitor(): IErrorMonitor {
  return config.SENTRY_DSN ? new SentryErrorMonitor() : new NoopErrorMonitor();
}

export type { IErrorMonitor, ErrorMonitorContext } from './IErrorMonitor';
