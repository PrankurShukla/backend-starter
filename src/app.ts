import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import pinoHttp from 'pino-http';
import { config } from './config/environment';
import { logger } from './config/logger';
import { requestContext } from './middlewares/requestContext';
import { apiResponse } from './middlewares/apiResponse';
import { apiLimiter } from './middlewares/rateLimiter';
import { notFound } from './middlewares/notFound';
import { createErrorHandler } from './middlewares/errorHandler';
import { createHealthRoutes } from './routes/health.routes';
import { createUserRoutes } from './routes/user.routes';
import { createContainer, type AppContainer, type ContainerOptions } from './bootstrap/container';
import { AllowListCorsPolicy, type ICorsPolicy } from './providers/cors/ICorsPolicy';
import { createHttpMetrics } from './observability/metrics/httpMetrics';
import { createMetricsRoutes } from './routes/metrics.routes';

export interface CreateAppOptions extends ContainerOptions {
  container?: AppContainer;
  corsPolicy?: ICorsPolicy;
  registerRoutes?: (app: Express, container: AppContainer) => void;
}

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const container = options.container ?? createContainer(options);
  const corsPolicy = options.corsPolicy ?? new AllowListCorsPolicy(config.CORS_ORIGINS);

  app.disable('x-powered-by');
  if (config.TRUST_PROXY) app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(pinoHttp({
    logger,
    quietReqLogger: true,
    genReqId: (_req, res) => String(res.locals.requestId ?? 'unknown'),
    customLogLevel: (_req, res, error) => error || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
  }));
  app.use((req, res, next) => {
    const startedAt = performance.now();
    res.on('finish', () => {
      const durationMs = performance.now() - startedAt;
      if (durationMs >= 250) {
        logger.warn({
          requestId: res.locals.requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs,
        }, 'Slow request detected');
      }
    });
    next();
  });

  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      Promise.resolve(corsPolicy.isAllowed(origin))
        .then(allowed => callback(null, allowed))
        .catch(error => {
          logger.error({ err: error, origin }, 'CORS policy evaluation failed');
          callback(null, false);
        });
    },
  }));

  app.use(helmet());
  app.use(hpp());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(apiResponse);
  if (config.METRICS_ENABLED) app.use(createHttpMetrics(container.metrics));

  app.use(createHealthRoutes(container.healthService));
  app.use(createMetricsRoutes(container.metrics));
  app.use(apiLimiter);
  app.use('/api/v1/users', createUserRoutes(container.userService));
  options.registerRoutes?.(app, container);

  app.use(notFound);
  app.use(createErrorHandler(container.errorMonitor));

  return app;
}
