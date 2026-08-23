import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import type { EmailMessage, IEmailProvider } from '../../providers/email/IEmailProvider';

export class ConsoleEmailProvider implements IEmailProvider {
  constructor(private readonly logger: Logger) {}

  send(message: EmailMessage): Promise<{ messageId: string }> {
    const messageId = randomUUID();
    const recipients = (Array.isArray(message.to) ? message.to : [message.to]).map(address => address.email);
    this.logger.info({ messageId, recipients, subject: message.subject }, 'Development email accepted');
    return Promise.resolve({ messageId });
  }
}
