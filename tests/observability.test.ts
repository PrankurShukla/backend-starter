import type { Express } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createContainer } from '../src/bootstrap/container';
import type { ErrorMonitorContext, IErrorMonitor } from '../src/observability/error-monitoring';
import { FunctionHealthCheck } from '../src/providers/health/FunctionHealthCheck';

class RecordingErrorMonitor implements IErrorMonitor {
  readonly errors: unknown[] = [];
  captureException(error: unknown, _context?: ErrorMonitorContext): void { this.errors.push(error); }
  captureMessage(_message: string, _context?: ErrorMonitorContext): void {}
  flush(): Promise<boolean> { return Promise.resolve(true); }
}

describe('production observability', () => {
  it('exports Prometheus-compatible runtime and HTTP metrics', async () => {
    const app = createApp();
    await request(app).get('/health').expect(200);

    const response = await request(app).get('/metrics').expect(200);
    expect(response.text).toContain('http_requests_total');
    expect(response.text).toContain('http_request_duration_seconds');
    expect(response.headers['content-type']).toContain('text/plain');
  });

  it('reports unexpected server errors without exposing their message', async () => {
    const monitor = new RecordingErrorMonitor();
    const container = createContainer({ errorMonitor: monitor });
    const app = createApp({
      container,
      registerRoutes(expressApp: Express) {
        expressApp.get('/boom', () => { throw new Error('database password leaked'); });
      },
    });

    const response = await request(app).get('/boom').expect(500);
    expect(response.body.error.code).toBe('INTERNAL_ERROR');
    expect(response.body.error.message).toBe('An unexpected error occurred');
    expect(JSON.stringify(response.body)).not.toContain('database password leaked');
    expect(monitor.errors).toHaveLength(1);
  });

  it('fails readiness when a registered dependency is unavailable', async () => {
    const dependency = new FunctionHealthCheck('database', () => Promise.reject(new Error('connection refused')));
    const app = createApp({ healthChecks: [dependency] });

    const response = await request(app).get('/ready').expect(503);
    expect(response.body.data.ready).toBe(false);
    expect(response.body.data.checks[0]).toMatchObject({ name: 'database', healthy: false });
  });
});
