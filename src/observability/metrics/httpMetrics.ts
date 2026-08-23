import type { RequestHandler } from 'express';
import type { MetricsService } from './MetricsService';

export function createHttpMetrics(metrics: MetricsService): RequestHandler {
  return (req, res, next) => {
    const startedAt = process.hrtime.bigint();
    metrics.activeRequests.inc({ method: req.method });

    let completed = false;
    const record = () => {
      if (completed) return;
      completed = true;
      const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
      const routeConfig = req.route as { path?: unknown } | undefined;
      const route = typeof routeConfig?.path === 'string' ? `${req.baseUrl}${routeConfig.path}` : 'unmatched';
      const labels = { method: req.method, route, status_code: String(res.statusCode) };
      metrics.httpRequests.inc(labels);
      metrics.httpDuration.observe(labels, durationSeconds);
      metrics.activeRequests.dec({ method: req.method });
    };
    res.once('finish', record);
    res.once('close', record);
    next();
  };
}
