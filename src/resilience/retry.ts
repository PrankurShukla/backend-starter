export interface RetryOptions {
  attempts: number;
  initialDelayMs?: number;
  maximumDelayMs?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

export async function retry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const initialDelay = options.initialDelayMs ?? 100;
  const maxDelay = options.maximumDelayMs ?? 5_000;
  const multiplier = options.backoffMultiplier ?? 2;
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;
      const canRetry = attempt < options.attempts && (options.shouldRetry?.(error, attempt) ?? true);
      if (!canRetry) throw error;

      const baseDelay = Math.min(maxDelay, initialDelay * multiplier ** (attempt - 1));
      const delayMs = options.jitter === false ? baseDelay : Math.round(baseDelay * (0.5 + Math.random() * 0.5));
      options.onRetry?.(error, attempt, delayMs);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
