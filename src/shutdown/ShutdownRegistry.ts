import type { Logger } from 'pino';

export interface ShutdownTask {
  name: string;
  priority?: number;
  close(): Promise<void> | void;
}

export class ShutdownRegistry {
  private readonly tasks: ShutdownTask[] = [];
  private shuttingDown = false;

  constructor(private readonly logger: Logger) {}

  register(task: ShutdownTask): void {
    if (this.shuttingDown) throw new Error(`Cannot register shutdown task ${task.name} during shutdown`);
    this.tasks.push(task);
  }

  async closeAll(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    const tasks = [...this.tasks].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
    const failures: Error[] = [];
    for (const task of tasks) {
      try {
        await task.close();
        this.logger.info({ component: task.name }, 'Shutdown task completed');
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        failures.push(failure);
        this.logger.error({ err: failure, component: task.name }, 'Shutdown task failed');
      }
    }

    if (failures.length) throw new AggregateError(failures, 'One or more shutdown tasks failed');
  }
}
