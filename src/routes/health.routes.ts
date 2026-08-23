import { Router } from 'express';
import type { HealthService } from '../services/health.service';
import { createHealthController } from '../controllers/health.controller';

export function createHealthRoutes(healthService: HealthService) {
  const router = Router();
  const controller = createHealthController(healthService);

  router.get('/health', controller.live);
  router.get('/ready', controller.ready);

  return router;
}
