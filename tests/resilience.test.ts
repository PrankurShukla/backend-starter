import { describe, expect, it, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../src/resilience/CircuitBreaker';
import { retry } from '../src/resilience/retry';
import { resilientFetch } from '../src/resilience/resilientFetch';

describe('resilience utilities', () => {
  it('retries transient operations and eventually returns the result', async () => {
    const operation = vi.fn<(attempt: number) => Promise<string>>()
      .mockRejectedValueOnce(new Error('temporary'))
      .mockRejectedValueOnce(new Error('temporary'))
      .mockResolvedValue('done');

    const result = await retry(operation, { attempts: 3, initialDelayMs: 1, jitter: false });
    expect(result).toBe('done');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('does not retry errors rejected by the policy', async () => {
    const operation = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('permanent'));
    await expect(retry(operation, { attempts: 3, shouldRetry: () => false })).rejects.toThrow('permanent');
    expect(operation).toHaveBeenCalledOnce();
  });

  it('opens, probes and closes a circuit around a failing dependency', async () => {
    let now = 1_000;
    const breaker = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 500, now: () => now });

    await expect(breaker.execute(() => Promise.reject(new Error('failure one')))).rejects.toThrow('failure one');
    await expect(breaker.execute(() => Promise.reject(new Error('failure two')))).rejects.toThrow('failure two');
    expect(breaker.state).toBe('OPEN');
    await expect(breaker.execute(() => Promise.resolve('blocked'))).rejects.toBeInstanceOf(CircuitOpenError);

    now += 500;
    expect(breaker.state).toBe('HALF_OPEN');
    await expect(breaker.execute(() => Promise.resolve('healthy'))).resolves.toBe('healthy');
    expect(breaker.state).toBe('CLOSED');
  });

  it('retries idempotent HTTP requests on retryable responses', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await resilientFetch('https://service.example/health', {
      retry: { attempts: 2, initialDelayMs: 1, jitter: false },
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('does not automatically retry non-idempotent requests', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(resilientFetch('https://service.example/orders', { method: 'POST' }))
      .rejects.toThrow('Retryable HTTP response 503');
    expect(fetchMock).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
