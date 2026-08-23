import { config } from '../config/environment';
import { retry, type RetryOptions } from './retry';
import type { CircuitBreaker } from './CircuitBreaker';

export interface ResilientFetchOptions extends RequestInit {
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  circuitBreaker?: CircuitBreaker;
}

function retryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export async function resilientFetch(url: string | URL, options: ResilientFetchOptions = {}): Promise<Response> {
  const { timeoutMs = config.OUTBOUND_TIMEOUT_MS, retry: retryOptions, circuitBreaker, ...requestOptions } = options;
  const method = (requestOptions.method ?? 'GET').toUpperCase();
  const isIdempotent = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method) || Boolean(requestOptions.headers && new Headers(requestOptions.headers).has('idempotency-key'));

  const operation = async () => {
    const response = await fetch(url, { ...requestOptions, signal: AbortSignal.timeout(timeoutMs) });
    if (retryableStatus(response.status)) throw new RetryableHttpError(response.status, await response.text());
    return response;
  };

  const protectedOperation = () => circuitBreaker ? circuitBreaker.execute(operation) : operation();
  if (!isIdempotent) return protectedOperation();

  return retry(protectedOperation, {
    attempts: retryOptions?.attempts ?? config.OUTBOUND_RETRY_ATTEMPTS,
    ...(retryOptions?.initialDelayMs === undefined ? {} : { initialDelayMs: retryOptions.initialDelayMs }),
    ...(retryOptions?.maximumDelayMs === undefined ? {} : { maximumDelayMs: retryOptions.maximumDelayMs }),
    ...(retryOptions?.backoffMultiplier === undefined ? {} : { backoffMultiplier: retryOptions.backoffMultiplier }),
    ...(retryOptions?.jitter === undefined ? {} : { jitter: retryOptions.jitter }),
    shouldRetry: retryOptions?.shouldRetry ?? (error => error instanceof RetryableHttpError || (error instanceof Error && error.name === 'TimeoutError')),
    ...(retryOptions?.onRetry === undefined ? {} : { onRetry: retryOptions.onRetry }),
  });
}

export class RetryableHttpError extends Error {
  constructor(public readonly status: number, public readonly responseBody: string) {
    super(`Retryable HTTP response ${status}`);
    this.name = 'RetryableHttpError';
  }
}
