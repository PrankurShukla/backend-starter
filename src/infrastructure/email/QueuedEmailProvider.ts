import type { EmailMessage, IEmailProvider } from '../../providers/email/IEmailProvider';
import type { IQueueProvider } from '../../providers/queue/IQueueProvider';

export const SEND_EMAIL_JOB = 'email.send';

export class QueuedEmailProvider implements IEmailProvider {
  constructor(private readonly queue: IQueueProvider) {}

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    const { jobId } = await this.queue.enqueue({ type: SEND_EMAIL_JOB, payload: message });
    return { messageId: jobId };
  }
}
