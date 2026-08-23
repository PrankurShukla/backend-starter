import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';
import type { EmailAddress, EmailMessage, IEmailProvider } from '../../providers/email/IEmailProvider';

function formatAddress(address: EmailAddress): string | { address: string; name: string } {
  return address.name ? { address: address.email, name: address.name } : address.email;
}

export interface SmtpOptions {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
  from: string;
}

export class SmtpEmailProvider implements IEmailProvider {
  private readonly transporter: Transporter<SMTPPool.SentMessageInfo>;

  constructor(private readonly options: SmtpOptions) {
    const transportOptions: SMTPPool.Options = {
      host: options.host,
      port: options.port,
      secure: options.secure,
      ...(options.user && options.password ? { auth: { user: options.user, pass: options.password } } : {}),
      pool: true,
      connectionTimeout: 10_000,
      socketTimeout: 30_000,
    };
    this.transporter = nodemailer.createTransport(transportOptions);
  }

  async send(message: EmailMessage): Promise<{ messageId: string }> {
    const result = await this.transporter.sendMail({
      from: this.options.from,
      to: (Array.isArray(message.to) ? message.to : [message.to]).map(formatAddress),
      subject: message.subject,
      ...(message.text ? { text: message.text } : {}),
      ...(message.html ? { html: message.html } : {}),
      ...(message.replyTo ? { replyTo: formatAddress(message.replyTo) } : {}),
    });
    return { messageId: result.messageId };
  }

  async check(): Promise<void> {
    await this.transporter.verify();
  }

  close(): void {
    this.transporter.close();
  }
}
