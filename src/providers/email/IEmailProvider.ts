export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailAddress | EmailAddress[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: EmailAddress;
}

export interface IEmailProvider {
  send(message: EmailMessage): Promise<{ messageId: string }>;
}
