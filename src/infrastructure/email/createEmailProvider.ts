import type { AppConfig } from '../../config/environment';
import type { Logger } from 'pino';
import type { IEmailProvider } from '../../providers/email/IEmailProvider';
import { ConsoleEmailProvider } from './ConsoleEmailProvider';
import { SmtpEmailProvider } from './SmtpEmailProvider';

export function createEmailProvider(config: AppConfig, logger: Logger): IEmailProvider & { close?: () => void } {
  if (config.EMAIL_PROVIDER === 'smtp') {
    return new SmtpEmailProvider({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      from: config.EMAIL_FROM,
      ...(config.SMTP_USER ? { user: config.SMTP_USER } : {}),
      ...(config.SMTP_PASSWORD ? { password: config.SMTP_PASSWORD } : {}),
    });
  }
  return new ConsoleEmailProvider(logger);
}
