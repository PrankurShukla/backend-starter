import { Worker } from 'bullmq';
import type IORedis from 'ioredis';
import type { Logger } from 'pino';
import type { QueueJob } from '../../providers/queue/IQueueProvider';
import type { JobHandlerRegistry } from './JobHandlerRegistry';

export class BullMqWorkerRuntime {
  private readonly worker: Worker<QueueJob>;

  constructor(name: string, connection: IORedis, concurrency: number, handlers: JobHandlerRegistry, logger: Logger) {
    this.worker = new Worker<QueueJob>(name, async job => {
      await handlers.process(job.data, String(job.id));
    }, { connection, concurrency });
    this.worker.on('completed', job => logger.info({ jobId: job.id, jobType: job.name }, 'Background job completed'));
    this.worker.on('failed', (job, error) => logger.error({ err: error, jobId: job?.id, jobType: job?.name }, 'Background job failed'));
    this.worker.on('error', error => logger.error({ err: error }, 'Background worker error'));
  }

  waitUntilReady(): Promise<unknown> {
    return this.worker.waitUntilReady();
  }

  close(): Promise<void> {
    return this.worker.close();
  }
}
