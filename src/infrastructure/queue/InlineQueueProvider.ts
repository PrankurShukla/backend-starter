import { randomUUID } from 'node:crypto';
import type { IQueueProvider, QueueJob } from '../../providers/queue/IQueueProvider';
import type { JobHandlerRegistry } from './JobHandlerRegistry';

export class InlineQueueProvider implements IQueueProvider {
  constructor(private readonly handlers: JobHandlerRegistry) {}

  async enqueue<TPayload>(job: QueueJob<TPayload>): Promise<{ jobId: string }> {
    const jobId = job.idempotencyKey ?? randomUUID();
    if (job.availableAt && job.availableAt > new Date()) {
      throw new Error('The inline development queue does not support delayed jobs');
    }
    await this.handlers.process(job, jobId);
    return { jobId };
  }
}
