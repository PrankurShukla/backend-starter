export interface ErrorMonitorContext {
  requestId?: string;
  userId?: string;
  tenantId?: string;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface IErrorMonitor {
  captureException(error: unknown, context?: ErrorMonitorContext): void;
  captureMessage(message: string, context?: ErrorMonitorContext): void;
  flush(timeoutMs?: number): Promise<boolean>;
}
