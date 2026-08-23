import type { RequestHandler } from 'express';
import { config } from '../config/environment';
import type { HealthService } from '../services/health.service';

export function createHealthController(healthService: HealthService) {
  const live: RequestHandler = (_req, res) => {
    res.success({
      status: 'alive',
      service: config.SERVICE_NAME,
      version: config.SERVICE_VERSION,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  };

  const ready: RequestHandler = async (_req, res, next) => {
    try {
      const result = await healthService.readiness();
      res.success(result, result.ready ? 'Service is ready' : 'Service is not ready', result.ready ? 200 : 503);
    } catch (error) {
      next(error);
    }
  };

  return { live, ready };
}
