import type { QueueJob } from '../../providers/queue/IQueueProvider';

export type JobHandler<TPayload = unknown> = (payload: TPayload, jobId: string) => Promise<void>;

export class JobHandlerRegistry {
  private readonly handlers = new Map<string, JobHandler>();

  register<TPayload>(type: string, handler: JobHandler<TPayload>): void {
    if (this.handlers.has(type)) throw new Error(`A handler is already registered for job type ${type}`);
    this.handlers.set(type, handler as JobHandler);
  }

  async process(job: QueueJob, jobId: string): Promise<void> {
    const handler = this.handlers.get(job.type);
    if (!handler) throw new Error(`No handler registered for job type ${job.type}`);
    await handler(job.payload, jobId);
  }
}
