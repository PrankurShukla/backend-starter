export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  resetTimeoutMs: number;
  successThreshold?: number;
  now?: () => number;
}

export class CircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`Circuit is open; retry after ${retryAfterMs}ms`);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitBreaker {
  private failures = 0;
  private halfOpenSuccesses = 0;
  private openedAt = 0;
  private currentState: CircuitState = 'CLOSED';
  private readonly now: () => number;

  constructor(private readonly options: CircuitBreakerOptions) {
    this.now = options.now ?? Date.now;
  }

  get state(): CircuitState {
    if (this.currentState === 'OPEN' && this.now() - this.openedAt >= this.options.resetTimeoutMs) {
      this.currentState = 'HALF_OPEN';
      this.halfOpenSuccesses = 0;
    }
    return this.currentState;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      throw new CircuitOpenError(Math.max(0, this.options.resetTimeoutMs - (this.now() - this.openedAt)));
    }

    try {
      const result = await operation();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    if (this.currentState === 'HALF_OPEN') {
      this.halfOpenSuccesses += 1;
      if (this.halfOpenSuccesses < (this.options.successThreshold ?? 1)) return;
    }
    this.failures = 0;
    this.currentState = 'CLOSED';
  }

  private recordFailure(): void {
    this.failures += 1;
    if (this.currentState === 'HALF_OPEN' || this.failures >= this.options.failureThreshold) {
      this.currentState = 'OPEN';
      this.openedAt = this.now();
    }
  }
}
