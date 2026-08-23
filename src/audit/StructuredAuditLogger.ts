import type { Logger } from 'pino';
import { getRequestId } from '../middlewares/requestContext';
import type { AuditEvent, IAuditLogger } from './IAuditLogger';

export class StructuredAuditLogger implements IAuditLogger {
  constructor(private readonly logger: Logger) {}

  record(event: AuditEvent): Promise<void> {
    this.logger.info({
      audit: true,
      requestId: getRequestId(),
      ...event,
      occurredAt: (event.occurredAt ?? new Date()).toISOString(),
    }, 'Audit event');
    return Promise.resolve();
  }
}
