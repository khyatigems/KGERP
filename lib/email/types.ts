export type EmailStatus =
  | "DRAFT"
  | "QUEUED"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "FAILED"
  | "BOUNCED";

export interface EmailAttachment {
  fileName: string;
  mimeType: string;
  content: Buffer;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  providerMessageId?: string;
  status: "SENT" | "QUEUED" | "FAILED";
  error?: string;
}

export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

export interface InboundEmail {
  providerMessageId: string;
  from: string;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: Date;
  references: string[];
}

export interface InboundEmailResult {
  matchedCustomerId: string | null;
  matchedOrderId: string | null;
  handled: boolean;
}
