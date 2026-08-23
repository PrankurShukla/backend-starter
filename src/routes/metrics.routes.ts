import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { config } from '../config/environment';
import type { MetricsService } from '../observability/metrics/MetricsService';

function tokenMatches(value: string, expected: string): boolean {
  const supplied = Buffer.from(value);
  const configured = Buffer.from(expected);
  return supplied.length === configured.length && timingSafeEqual(supplied, configured);
}

export function createMetricsRoutes(metrics: MetricsService) {
  const router = Router();
  router.get('/metrics', async (req, res) => {
    if (!config.METRICS_ENABLED) {
      res.status(404).end();
      return;
    }

    if (config.METRICS_TOKEN) {
      const supplied = req.header('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
      if (!tokenMatches(supplied, config.METRICS_TOKEN)) {
        res.status(401).end();
        return;
      }
    }

    res.setHeader('content-type', metrics.contentType);
    res.end(await metrics.render());
  });
  return router;
}
