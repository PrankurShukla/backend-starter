export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';

export interface AuditEvent {
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId?: string;
  tenantId?: string;
  outcome: AuditOutcome;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface IAuditLogger {
  record(event: AuditEvent): Promise<void>;
}
