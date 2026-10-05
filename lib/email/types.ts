export type EmailStatus =
  | "DRAFT"
  | "QUEUED"
  | "PROCESSING"
  | "SENT"
  | "DELIVERED"
  | "OPENED"
  | "RECEIVED"
  | "FAILED"
  | "BOUNCED"
  | "CANCELLED";

export interface EmailAttachment {
  fileName: string;
  mimeType: string;
  content: Buffer;
  sourceType?: "INVOICE" | "INVENTORY";
  sourceId?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  inReplyTo?: string;
  references?: string[];
  messageId?: string;
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
  cc?: string | null;
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  contentError?: string | null;
  receivedAt: Date | null;
  references: string[];
  inReplyTo?: string | null;
  messageId?: string | null;
}

export interface InboundEmailResult {
  matchedCustomerId: string | null;
  matchedOrderId: string | null;
  handled: boolean;
  created?: boolean;
  updated?: boolean;
}
