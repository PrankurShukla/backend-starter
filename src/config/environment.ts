import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z.string().default('false').transform(value => value === 'true');
const optionalUrl = z.string().url().or(z.literal('')).default('');

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
  DATABASE_PROVIDER: z.enum(['memory', 'prisma']).default('memory'),
  DATABASE_URL: z.string().default(''),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().max(100).default(10),
  AUTH_ENABLED: z.string().default('true').transform(value => value === 'true'),
  ACCESS_TOKEN_SECRET: z.string().default('development-access-token-secret-change-me'),
  REFRESH_TOKEN_SECRET: z.string().default('development-refresh-token-secret-change-me'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(15 * 60),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60),
  PASSWORD_SCRYPT_COST: z.coerce.number().int().min(2 ** 14).max(2 ** 20).default(2 ** 14),
  BOOTSTRAP_ADMIN_EMAIL: z.string().email().or(z.literal('')).default(''),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().default(''),
  BOOTSTRAP_ADMIN_FIRST_NAME: z.string().min(1).default('System'),
  BOOTSTRAP_ADMIN_LAST_NAME: z.string().min(1).default('Administrator'),
  QUEUE_PROVIDER: z.enum(['inline', 'bullmq']).default('inline'),
  QUEUE_NAME: z.string().min(1).default('background-jobs'),
  REDIS_URL: z.string().default(''),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().max(100).default(5),
  EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
  EMAIL_FROM: z.string().email().default('no-reply@example.com'),
  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().max(65_535).default(587),
  SMTP_SECURE: booleanFromString,
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
  LOCAL_STORAGE_PATH: z.string().min(1).default('uploads'),
  S3_REGION: z.string().min(1).default('us-east-1'),
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET: z.string().default(''),
  S3_ACCESS_KEY_ID: z.string().default(''),
  S3_SECRET_ACCESS_KEY: z.string().default(''),
  S3_FORCE_PATH_STYLE: booleanFromString,
  S3_PUBLIC_BASE_URL: optionalUrl,
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
  if (value.DATABASE_PROVIDER === 'prisma' && !value.DATABASE_URL) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_URL'], message: 'DATABASE_URL is required for Prisma' });
  }
  if (value.QUEUE_PROVIDER === 'bullmq' && !value.REDIS_URL) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['REDIS_URL'], message: 'REDIS_URL is required for BullMQ' });
  }
  if (value.EMAIL_PROVIDER === 'smtp' && !value.SMTP_HOST) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['SMTP_HOST'], message: 'SMTP_HOST is required for SMTP email' });
  }
  if (value.STORAGE_PROVIDER === 's3' && (!value.S3_BUCKET || !value.S3_ACCESS_KEY_ID || !value.S3_SECRET_ACCESS_KEY)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['S3_BUCKET'], message: 'S3 bucket and credentials are required for S3 storage' });
  }
  if (value.AUTH_ENABLED && (value.ACCESS_TOKEN_SECRET.length < 32 || value.REFRESH_TOKEN_SECRET.length < 32)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['ACCESS_TOKEN_SECRET'], message: 'Authentication secrets must contain at least 32 characters' });
  }
  if (value.NODE_ENV === 'production') {
    if (value.DATABASE_PROVIDER !== 'prisma') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['DATABASE_PROVIDER'], message: 'Production must use persistent Prisma storage' });
    }
    if (value.AUTH_ENABLED && (value.ACCESS_TOKEN_SECRET.includes('change-me') || value.REFRESH_TOKEN_SECRET.includes('change-me'))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['ACCESS_TOKEN_SECRET'], message: 'Production authentication secrets must be replaced' });
    }
    if (value.EMAIL_PROVIDER === 'console') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['EMAIL_PROVIDER'], message: 'Production must use a real email provider' });
    }
    if (value.QUEUE_PROVIDER !== 'bullmq') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['QUEUE_PROVIDER'], message: 'Production must use a durable BullMQ queue' });
    }
    if (value.STORAGE_PROVIDER === 'local') {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['STORAGE_PROVIDER'], message: 'Production must use durable object storage' });
    }
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
