import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export class MetricsService {
  readonly registry = new Registry();
  readonly httpRequests: Counter<'method' | 'route' | 'status_code'>;
  readonly httpDuration: Histogram<'method' | 'route' | 'status_code'>;
  readonly activeRequests: Gauge<'method'>;

  constructor(serviceName: string, collectRuntimeMetrics = true) {
    this.registry.setDefaultLabels({ service: serviceName });
    if (collectRuntimeMetrics) collectDefaultMetrics({ register: this.registry, prefix: 'nodejs_' });

    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });
    this.activeRequests = new Gauge({
      name: 'http_requests_active',
      help: 'HTTP requests currently being processed',
      labelNames: ['method'],
      registers: [this.registry],
    });
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
