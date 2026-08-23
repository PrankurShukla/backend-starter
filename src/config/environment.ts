import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.string().default('false').transform(value => value === 'true');

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(5000),
  SERVICE_NAME: z.string().min(1).default('backend-service'),
  SERVICE_VERSION: z.string().min(1).default('0.1.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  TRUST_PROXY: booleanFromString,
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  SENTRY_DSN: z.string().url().or(z.literal('')).default(''),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  OTEL_ENABLED: booleanFromString,
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().default('http://localhost:4318'),
  OTEL_EXPORT_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
  METRICS_ENABLED: z.string().default('true').transform(value => value === 'true'),
  METRICS_TOKEN: z.string().default(''),
  OUTBOUND_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  OUTBOUND_RETRY_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(5),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && value.METRICS_ENABLED && !value.METRICS_TOKEN) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['METRICS_TOKEN'],
      message: 'METRICS_TOKEN is required when metrics are enabled in production',
    });
  }
});

const parsed = environmentSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

export const config = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map(origin => origin.trim().replace(/\/$/, '')).filter(Boolean),
} as const;

export type AppConfig = typeof config;
