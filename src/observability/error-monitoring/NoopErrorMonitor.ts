import type { ErrorMonitorContext, IErrorMonitor } from './IErrorMonitor';

export class NoopErrorMonitor implements IErrorMonitor {
  captureException(_error: unknown, _context?: ErrorMonitorContext): void {}
  captureMessage(_message: string, _context?: ErrorMonitorContext): void {}
  flush(_timeoutMs?: number): Promise<boolean> { return Promise.resolve(true); }
}
