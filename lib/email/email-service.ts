import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { EmailAttachment } from "./types";
import { renderTemplate, type TemplateVariables } from "./template-renderer";
import { getEmailTemplateByKey } from "./templates";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { processEmailQueueItem } from "./queue";
import { appendCompanyEmailSignature } from "./signature";

export interface SendEmailInput {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  templateKey?: string;
  variables?: TemplateVariables;
  customerId?: string | null;
  orderId?: string | null;
  emailType?: string;
  attachments?: EmailAttachment[];
  threadId?: string | null;
  inReplyTo?: string | null;
  references?: string[];
  saveAsDraft?: boolean;
  scheduledAt?: Date | null;
  idempotencyKey?: string | null;
}

export interface SendEmailResult {
  success: boolean;
  logId: string;
  status: string;
  providerMessageId?: string;
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const to = String(input.to || "").trim();
  if (!input.saveAsDraft && (!to || !isValidEmail(to))) {
    return { success: false, logId: "", status: "FAILED", error: "Invalid recipient email address" };
  }

  await ensureMarketplaceFoundationSchema();
  const idempotencyKey = input.idempotencyKey?.trim() || null;
  if (idempotencyKey) {
    const existing = await prisma.emailLog.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, providerMessageId: true, lastError: true },
    });
    if (existing) {
      return {
        success: !["FAILED", "CANCELLED"].includes(existing.status),
        logId: existing.id,
        status: existing.status,
        providerMessageId: existing.providerMessageId ?? undefined,
        error: existing.lastError ?? undefined,
      };
    }
  }
  let subject = input.subject || "";
  let html = input.html;
  let text = input.text;
  let templateKey = input.templateKey || null;
  const company = await prisma.companySettings.findFirst({
    select: { companyName: true, logoUrl: true },
  });

  if (input.templateKey) {
    const template = await getEmailTemplateByKey(input.templateKey);
    if (template) {
      const variables: TemplateVariables = {
        company_name: company?.companyName || "KhyatiGems",
        ...(input.variables || {}),
      };
      subject = input.subject || renderTemplate(template.subject, variables);
      if (!html && template.htmlBody) html = renderTemplate(template.htmlBody, variables);
      if (!text && template.plainTextBody) {
        text = renderTemplate(template.plainTextBody, variables, { escape: false });
      }
      templateKey = template.key;
    }
  }

  const signedContent = appendCompanyEmailSignature({
    html,
    text,
    companyName: company?.companyName || "KhyatiGems",
  });
  html = signedContent.html;
  text = signedContent.text;

  const id = crypto.randomUUID();
  const attachments = input.attachments ?? [];
  const payload = {
    ...(input.cc?.length ? { cc: input.cc } : {}),
    ...(input.bcc?.length ? { bcc: input.bcc } : {}),
    ...(attachments.length
      ? {
          attachments: attachments.map((attachment) => ({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            contentBase64: attachment.content.toString("base64"),
          })),
        }
      : {}),
  };
  const queuedAt = new Date();
  const nextStatus = input.saveAsDraft ? "DRAFT" : "QUEUED";
  const nextRetryAt = input.saveAsDraft ? null : input.scheduledAt ?? queuedAt;
  try {
    await prisma.emailLog.create({
      data: {
      id,
      idempotencyKey,
      customerId: input.customerId ?? null,
      orderId: input.orderId ?? null,
      templateKey,
      recipient: to,
      cc: input.cc?.join(", ") || null,
      bcc: input.bcc?.join(", ") || null,
      subject: subject || "(no subject)",
      bodyRef: templateKey ? `template:${templateKey}` : "inline",
      bodyHtml: html ?? null,
      bodyText: text ?? null,
      payloadJson: JSON.stringify(payload),
      threadId: input.threadId || id,
      messageId: `<${crypto.randomUUID()}@khyatigems>`,
      inReplyTo: input.inReplyTo ?? null,
      referencesJson: JSON.stringify(input.references ?? []),
      emailType: input.emailType ?? null,
      provider: null,
      status: nextStatus,
      isRead: true,
      queuedAt: input.saveAsDraft ? null : queuedAt,
      nextRetryAt,
      attachmentsJson: attachments.length
        ? JSON.stringify(attachments.map((attachment) => ({
            fileName: attachment.fileName,
            mimeType: attachment.mimeType,
            sourceType: attachment.sourceType,
            sourceId: attachment.sourceId,
          })))
        : null,
      },
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";
    if (!idempotencyKey || code !== "P2002") throw error;
    const existing = await prisma.emailLog.findUnique({
      where: { idempotencyKey },
      select: { id: true, status: true, providerMessageId: true, lastError: true },
    });
    if (!existing) throw error;
    return {
      success: !["FAILED", "CANCELLED"].includes(existing.status),
      logId: existing.id,
      status: existing.status,
      providerMessageId: existing.providerMessageId ?? undefined,
      error: existing.lastError ?? undefined,
    };
  }

  if (input.saveAsDraft) {
    return { success: true, logId: id, status: "DRAFT" };
  }

  if (input.scheduledAt && input.scheduledAt.getTime() > Date.now()) {
    return { success: true, logId: id, status: "QUEUED" };
  }

  const outcome = await processEmailQueueItem(id, "SEND");
  const saved = await prisma.emailLog.findUnique({
    where: { id },
    select: { status: true, providerMessageId: true, lastError: true },
  });
  const finalStatus = saved?.status || outcome;
  return {
    success: finalStatus !== "FAILED",
    logId: id,
    status: finalStatus,
    providerMessageId: saved?.providerMessageId ?? undefined,
    error: saved?.lastError ?? undefined,
  };
}

export async function sendInvoiceEmail(input: {
  customerEmail: string;
  customerName: string;
  orderNumber?: string;
  purchaseDate?: string;
  invoiceNumber?: string;
  customerId?: string | null;
  orderId?: string | null;
  invoiceAttachment: EmailAttachment;
}) {
  return sendEmail({
    to: input.customerEmail,
    templateKey: "email_invoice",
    variables: {
      customer_name: input.customerName,
      order_number: input.orderNumber ?? "",
      order_number_line: input.orderNumber ? `Marketplace order reference: ${input.orderNumber}` : "",
      purchase_date: input.purchaseDate ?? "",
      invoice_number: input.invoiceNumber ?? "",
    },
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    emailType: "INVOICE",
    attachments: [input.invoiceAttachment],
  });
}

export async function sendCertificateEmail(input: {
  customerEmail: string;
  customerName: string;
  certificateNumber: string;
  certificateVerificationUrl?: string | null;
  gemstoneName?: string;
  orderNumber?: string;
  purchaseDate?: string;
  customerId?: string | null;
  orderId?: string | null;
  certificateAttachment: EmailAttachment;
}) {
  return sendEmail({
    to: input.customerEmail,
    templateKey: "email_certificate",
    variables: {
      customer_name: input.customerName,
      certificate_number: input.certificateNumber,
      certificate_verification_url: input.certificateVerificationUrl ?? "",
      gemstone_name: input.gemstoneName ?? "",
      order_number_line: input.orderNumber ? `Marketplace order reference: ${input.orderNumber}` : "",
      purchase_date: input.purchaseDate ?? "",
    },
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    emailType: "CERTIFICATE",
    attachments: [input.certificateAttachment],
  });
}

export async function sendCertificateAndInvoiceEmail(input: {
  customerEmail: string;
  customerName: string;
  orderNumber?: string;
  purchaseDate?: string;
  invoiceNumber?: string;
  certificateNumber: string;
  certificateVerificationUrl?: string | null;
  gemstoneName?: string;
  customerId?: string | null;
  orderId?: string | null;
  invoiceAttachment: EmailAttachment;
  certificateAttachment: EmailAttachment;
}) {
  return sendEmail({
    to: input.customerEmail,
    templateKey: "email_certificate_invoice",
    variables: {
      customer_name: input.customerName,
      order_number: input.orderNumber ?? "",
      order_number_line: input.orderNumber ? `Marketplace order reference: ${input.orderNumber}` : "",
      purchase_date: input.purchaseDate ?? "",
      invoice_number: input.invoiceNumber ?? "",
      certificate_number: input.certificateNumber,
      certificate_verification_url: input.certificateVerificationUrl ?? "",
      gemstone_name: input.gemstoneName ?? "",
    },
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    emailType: "CERTIFICATE_INVOICE",
    attachments: [input.invoiceAttachment, input.certificateAttachment],
  });
}
