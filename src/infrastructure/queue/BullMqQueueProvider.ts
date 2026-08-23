import { createHash } from 'node:crypto';
import { Queue } from 'bullmq';
import type IORedis from 'ioredis';
import type { IQueueProvider, QueueJob } from '../../providers/queue/IQueueProvider';

function safeJobId(idempotencyKey: string): string {
  return createHash('sha256').update(idempotencyKey).digest('hex');
}

export class BullMqQueueProvider implements IQueueProvider {
  private readonly queue: Queue<QueueJob>;

  constructor(name: string, connection: IORedis) {
    this.queue = new Queue<QueueJob>(name, { connection });
  }

  async enqueue<TPayload>(job: QueueJob<TPayload>): Promise<{ jobId: string }> {
    const queued = await this.queue.add(job.type, job, {
      ...(job.idempotencyKey ? { jobId: safeJobId(job.idempotencyKey) } : {}),
      ...(job.availableAt ? { delay: Math.max(0, job.availableAt.getTime() - Date.now()) } : {}),
      attempts: 5,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 24 * 60 * 60, count: 10_000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 50_000 },
    });
    if (!queued.id) throw new Error('BullMQ did not return a job identifier');
    return { jobId: queued.id };
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
