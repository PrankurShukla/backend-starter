import type { IHealthCheck } from './IHealthCheck';

export class FunctionHealthCheck implements IHealthCheck {
  constructor(public readonly name: string, private readonly operation: () => Promise<void>) {}
  check(): Promise<void> { return this.operation(); }
}
