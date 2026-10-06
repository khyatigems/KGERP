import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { sendEmail, isValidEmail } from "@/lib/email/email-service";
import type { EmailAttachment } from "@/lib/email/types";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { buildInvoiceData } from "@/lib/documents/invoice-data";
import { generateInvoicePdfBuffer } from "@/lib/documents/invoice-service";
import { getInvoiceOrderReference } from "@/lib/email/order-reference";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

const MAX_USER_ATTACHMENT_SIZE = 2 * 1024 * 1024;
const MAX_USER_ATTACHMENTS_SIZE = 3 * 1024 * 1024;
const MAX_MESSAGE_ATTACHMENT_SIZE = 20 * 1024 * 1024;
const RECIPIENTS_LIMIT = 10;

interface ComposePayload {
  action?: unknown;
  to?: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  text?: unknown;
  html?: unknown;
  templateKey?: unknown;
  variables?: unknown;
  customerId?: unknown;
  orderId?: unknown;
  attachInvoice?: unknown;
  attachments?: unknown;
  threadId?: unknown;
  inReplyTo?: unknown;
  references?: unknown;
  scheduledAt?: unknown;
}

function parseRecipients(value: unknown): string[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > RECIPIENTS_LIMIT) return null;
  const recipients = value.map((item) => typeof item === "string" ? item.trim() : "");
  if (recipients.some((email) => !isValidEmail(email))) return null;
  return [...new Set(recipients)];
}

function parseAttachments(value: unknown): { attachments: EmailAttachment[]; error?: string } {
  if (value === undefined) return { attachments: [] };
  if (!Array.isArray(value)) return { attachments: [], error: "Attachments must be an array" };
  const attachments: EmailAttachment[] = [];
  let totalBytes = 0;
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { attachments: [], error: "Each attachment must include valid file details" };
    }
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.fileName !== "string" ||
      !entry.fileName.trim() ||
      typeof entry.contentBase64 !== "string" ||
      !entry.contentBase64
    ) {
      return { attachments: [], error: "Each attachment requires a file name and base64 content" };
    }
    const encoded = entry.contentBase64;
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
      return { attachments: [], error: `Attachment ${entry.fileName} is not valid base64` };
    }
    const content = Buffer.from(encoded, "base64");
    if (content.byteLength > MAX_USER_ATTACHMENT_SIZE) {
      return { attachments: [], error: `Attachment ${entry.fileName} exceeds the 2 MB limit` };
    }
    totalBytes += content.byteLength;
    if (totalBytes > MAX_USER_ATTACHMENTS_SIZE) {
      return { attachments: [], error: "Total attachment size cannot exceed 3 MB" };
    }
    attachments.push({
      fileName: entry.fileName.trim().replace(/[\r\n]/g, "_"),
      mimeType:
        typeof entry.mimeType === "string" && /^[\w.+-]+\/[\w.+-]+$/.test(entry.mimeType)
          ? entry.mimeType
          : "application/octet-stream",
      content,
    });
  }
  return { attachments };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await getFeatureFlag(FEATURE_FLAG_KEYS.emailEngine))) {
    return NextResponse.json({ error: "Email engine is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as ComposePayload | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A valid message is required" }, { status: 400 });
  }
  const action = body.action;
  if (!["SEND", "DRAFT", "SCHEDULE"].includes(String(action))) {
    return NextResponse.json({ error: "Choose Send, Save Draft, or Schedule" }, { status: 400 });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || "";
  if (!idempotencyKey || idempotencyKey.length > 128) {
    return NextResponse.json({ error: "A valid Idempotency-Key header is required" }, { status: 400 });
  }
  if (action !== "DRAFT" && (typeof body.to !== "string" || !isValidEmail(body.to.trim()))) {
    return NextResponse.json({ error: "Enter a valid recipient email address" }, { status: 400 });
  }
  const cc = parseRecipients(body.cc);
  const bcc = parseRecipients(body.bcc);
  if (!cc || !bcc) return NextResponse.json({ error: "CC and BCC must contain up to 10 valid email addresses each" }, { status: 400 });
  if (action !== "DRAFT" && (typeof body.subject !== "string" || !body.subject.trim())) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (action !== "DRAFT" && (typeof body.text !== "string" || !body.text.trim()) && (typeof body.html !== "string" || !body.html.trim())) {
    return NextResponse.json({ error: "Message content is required" }, { status: 400 });
  }
  if (
    (typeof body.subject === "string" && body.subject.length > 998) ||
    (typeof body.text === "string" && body.text.length > 200_000) ||
    (typeof body.html === "string" && body.html.length > 1_000_000)
  ) {
    return NextResponse.json({ error: "Subject or message content exceeds the supported size" }, { status: 413 });
  }

  let scheduledAt: Date | undefined;
  if (action === "SCHEDULE") {
    if (typeof body.scheduledAt !== "string") return NextResponse.json({ error: "Choose a schedule date and time" }, { status: 400 });
    scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Schedule time must be in the future" }, { status: 400 });
    }
  }

  const { attachments, error: attachmentError } = parseAttachments(body.attachments);
  if (attachmentError) return NextResponse.json({ error: attachmentError }, { status: 400 });
  const invoiceId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const attachInvoice = body.attachInvoice === true;
  if (attachInvoice && !invoiceId) {
    return NextResponse.json({ error: "Select an invoice before attaching its PDF" }, { status: 400 });
  }
  const variables =
    body.variables && typeof body.variables === "object" && !Array.isArray(body.variables)
      ? Object.fromEntries(
          Object.entries(body.variables).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : {};
  if (invoiceId) {
    const invoiceRecord = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        createdAt: true,
        sales: { take: 1, orderBy: { saleDate: "asc" }, select: { saleDate: true } },
      },
    });
    if (!invoiceRecord) return NextResponse.json({ error: "Selected invoice was not found" }, { status: 404 });
    const orderNumber = await getInvoiceOrderReference(invoiceId);
    variables.purchase_date = formatDate(invoiceRecord.sales[0]?.saleDate || invoiceRecord.createdAt);
    variables.order_number = orderNumber || "";
    variables.order_number_line = orderNumber ? `Marketplace order reference: ${orderNumber}` : "";
  }
  if (attachInvoice) {
    try {
      const invoiceData = await buildInvoiceData(invoiceId);
      if (!invoiceData) {
        return NextResponse.json({ error: "The selected invoice has no printable invoice document to attach" }, { status: 422 });
      }
      const invoicePdf = await generateInvoicePdfBuffer(invoiceData);
      if (invoicePdf.buffer.byteLength > MAX_MESSAGE_ATTACHMENT_SIZE) {
        return NextResponse.json({ error: "The generated invoice PDF exceeds the 20 MB email attachment limit" }, { status: 413 });
      }
      attachments.push({
        fileName: invoicePdf.fileName,
        mimeType: invoicePdf.mimeType,
        content: invoicePdf.buffer,
        sourceType: "INVOICE",
        sourceId: invoiceId,
      });
    } catch (error) {
      console.error("[communication-compose] Could not generate selected invoice PDF:", error);
      return NextResponse.json({ error: "Could not generate the selected invoice PDF; email was not sent" }, { status: 500 });
    }
  }
  const totalAttachmentBytes = attachments.reduce((total, attachment) => total + attachment.content.byteLength, 0);
  if (totalAttachmentBytes > MAX_MESSAGE_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: "Total email attachment size cannot exceed 20 MB" }, { status: 413 });
  }
  const references = Array.isArray(body.references)
    ? body.references.filter((reference): reference is string => typeof reference === "string").slice(-20)
    : [];

  const result = await sendEmail({
    to: typeof body.to === "string" ? body.to.trim() : "",
    cc,
    bcc,
    subject: typeof body.subject === "string" ? body.subject.trim() : "",
    text: typeof body.text === "string" ? body.text : undefined,
    html: typeof body.html === "string" ? body.html : undefined,
    templateKey: typeof body.templateKey === "string" ? body.templateKey : undefined,
    variables,
    customerId: typeof body.customerId === "string" ? body.customerId : null,
    orderId: typeof body.orderId === "string" ? body.orderId : null,
    attachments,
    threadId: typeof body.threadId === "string" ? body.threadId : null,
    inReplyTo: typeof body.inReplyTo === "string" ? body.inReplyTo : null,
    references,
    saveAsDraft: action === "DRAFT",
    scheduledAt,
    idempotencyKey: `${session.user.id}:${idempotencyKey}`,
  });
  if (result.logId) {
    await logActivity({
      module: "communication",
      action: action === "DRAFT" ? "email.draft.create" : action === "SCHEDULE" ? "email.schedule" : "email.send",
      entityType: "EmailLog",
      entityId: result.logId,
      referenceId: result.logId,
      entityIdentifier: typeof body.subject === "string" && body.subject.trim()
        ? `Subject: ${body.subject.trim()}`
        : action === "DRAFT" ? "Email draft" : "Email message",
      description: action === "DRAFT"
        ? "Saved an email draft"
        : action === "SCHEDULE"
          ? "Scheduled an email"
          : result.success ? "Email sent" : "Email delivery failed",
      userId: session.user.id,
      userName: session.user.name ?? undefined,
      metadata: {
        requestedAction: action,
        resultStatus: result.status,
        customerId: typeof body.customerId === "string" ? body.customerId : null,
        orderId: typeof body.orderId === "string" ? body.orderId : null,
      },
    });
  }
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
