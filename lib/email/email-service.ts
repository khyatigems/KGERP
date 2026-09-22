import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { EmailAttachment } from "./types";
import { resolveEmailProvider } from "./provider";
import { renderTemplate, type TemplateVariables } from "./template-renderer";
import { getEmailTemplateByKey } from "./templates";

export interface SendEmailInput {
  to: string;
  subject?: string;
  html?: string;
  text?: string;
  templateKey?: string;
  variables?: TemplateVariables;
  customerId?: string | null;
  orderId?: string | null;
  emailType?: string;
  attachments?: EmailAttachment[];
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
  if (!to || !isValidEmail(to)) {
    return { success: false, logId: "", status: "FAILED", error: "Invalid recipient email address" };
  }

  let subject = input.subject || "";
  let html = input.html;
  let text = input.text;
  let templateKey = input.templateKey || null;

  if (input.templateKey) {
    const template = await getEmailTemplateByKey(input.templateKey);
    if (template) {
      const company = await prisma.companySettings.findFirst();
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

  const id = crypto.randomUUID();
  await prisma.emailLog.create({
    data: {
      id,
      customerId: input.customerId ?? null,
      orderId: input.orderId ?? null,
      templateKey,
      recipient: to,
      subject: subject || "(no subject)",
      bodyRef: templateKey ? `template:${templateKey}` : "inline",
      emailType: input.emailType ?? null,
      provider: null,
      status: "DRAFT",
      attachmentsJson: input.attachments?.length
        ? JSON.stringify(input.attachments.map((a) => ({ fileName: a.fileName, mimeType: a.mimeType })))
        : null,
    },
  });

  try {
    const provider = resolveEmailProvider();
    const result = await provider.send({
      to,
      subject: subject || "(no subject)",
      html,
      text,
      attachments: input.attachments,
    });

    await prisma.emailLog.update({
      where: { id },
      data: {
        provider: provider.name,
        providerMessageId: result.providerMessageId ?? null,
        status: result.status === "FAILED" ? "FAILED" : result.status === "SENT" ? "SENT" : "QUEUED",
        sentAt: result.status === "SENT" ? new Date() : undefined,
        failedAt: result.status === "FAILED" ? new Date() : undefined,
        errorMessage: result.error ?? null,
      },
    });

    return {
      success: result.status !== "FAILED",
      logId: id,
      status: result.status,
      providerMessageId: result.providerMessageId,
      error: result.error,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.emailLog.update({
      where: { id },
      data: { status: "FAILED", failedAt: new Date(), errorMessage: message },
    });
    return { success: false, logId: id, status: "FAILED", error: message };
  }
}

export async function sendInvoiceEmail(input: {
  customerEmail: string;
  customerName: string;
  orderNumber?: string;
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
  gemstoneName?: string;
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
      gemstone_name: input.gemstoneName ?? "",
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
  invoiceNumber?: string;
  certificateNumber: string;
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
      invoice_number: input.invoiceNumber ?? "",
      certificate_number: input.certificateNumber,
      gemstone_name: input.gemstoneName ?? "",
    },
    customerId: input.customerId ?? null,
    orderId: input.orderId ?? null,
    emailType: "CERTIFICATE_INVOICE",
    attachments: [input.invoiceAttachment, input.certificateAttachment],
  });
}
