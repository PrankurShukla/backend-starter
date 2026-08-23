export interface QueueJob<TPayload = unknown> {
  type: string;
  payload: TPayload;
  idempotencyKey?: string;
  availableAt?: Date;
}

export interface IQueueProvider {
  enqueue<TPayload>(job: QueueJob<TPayload>): Promise<{ jobId: string }>;
}
