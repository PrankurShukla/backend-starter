import pino, { type Logger } from 'pino';
import { config } from './environment';

export const logger: Logger = pino({
  name: config.SERVICE_NAME,
  level: config.LOG_LEVEL,
  base: {
    service: config.SERVICE_NAME,
    version: config.SERVICE_VERSION,
    environment: config.NODE_ENV,
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      '*.password',
      'token',
      '*.token',
      'refreshToken',
      '*.refreshToken',
    ],
    censor: '[REDACTED]',
  },
});
