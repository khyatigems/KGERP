import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { resolveEmailProvider } from "./provider";
import {
  classifyEmailFailure,
  isRetryableEmailFailure,
  MAX_EMAIL_ATTEMPTS,
  retryDelayMs,
  TRANSIENT_EMAIL_FAILURE_CODES,
} from "./retry-policy";
import type { EmailAttachment, EmailMessage } from "./types";

export {
  classifyEmailFailure,
  isRetryableEmailFailure,
  MAX_EMAIL_ATTEMPTS,
  TRANSIENT_EMAIL_FAILURE_CODES,
} from "./retry-policy";

interface StoredEmailPayload {
  cc?: string[];
  bcc?: string[];
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    contentBase64: string;
  }>;
}

interface EmailAttemptRecord {
  attempt: number;
  at: string;
  status: "SENT" | "QUEUED" | "FAILED";
  failureCode?: string;
  error?: string;
  providerMessageId?: string;
  triggeredBy: "SEND" | "AUTOMATIC_RETRY" | "MANUAL_RETRY";
}

function parseJson<T>(value: string | null | undefined): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error("[email-queue] Failed to parse persisted email JSON:", error);
    return null;
  }
}

function retryAt(attemptCount: number, now: Date): Date | null {
  const delay = retryDelayMs(attemptCount);
  return delay === null ? null : new Date(now.getTime() + delay);
}

function parseStoredAttachments(payload: StoredEmailPayload): EmailAttachment[] {
  return (payload.attachments || []).map((attachment) => ({
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    content: Buffer.from(attachment.contentBase64, "base64"),
  }));
}

function appendAttempt(history: EmailAttemptRecord[], record: EmailAttemptRecord): string {
  return JSON.stringify([...history, record].slice(-50));
}

export interface EmailQueueResult {
  scanned: number;
  processed: number;
  sent: number;
  providerQueued: number;
  retryScheduled: number;
  failed: number;
  skipped: number;
}

export type ManualEmailAction = "RETRY" | "SEND_NOW" | "CANCEL";

export async function performManualEmailAction(id: string, action: ManualEmailAction) {
  await ensureMarketplaceFoundationSchema();
  const email = await prisma.emailLog.findUnique({
    where: { id },
    select: {
      status: true,
      attemptCount: true,
      failureCode: true,
      nextRetryAt: true,
      attachmentsJson: true,
      payloadJson: true,
    },
  });
  if (!email) return { success: false, error: "Communication not found" };

  if (action === "CANCEL") {
    if (email.status !== "DRAFT" && !(email.status === "QUEUED" && email.nextRetryAt)) {
      return { success: false, error: "Only drafts or retry-scheduled emails can be cancelled" };
    }
    const updated = await prisma.emailLog.updateMany({
      where: {
        id,
        OR: [{ status: "DRAFT" }, { status: "QUEUED", nextRetryAt: { not: null } }],
      },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        nextRetryAt: null,
        processingStartedAt: null,
      },
    });
    return updated.count
      ? { success: true, status: "CANCELLED" }
      : { success: false, error: "Communication changed state before it could be cancelled" };
  }

  const allowed =
    action === "RETRY"
      ? email.status === "FAILED" && isRetryableEmailFailure(email.failureCode, email.attemptCount)
      : email.status === "QUEUED" &&
        Boolean(email.nextRetryAt) &&
        (email.attemptCount === 0 || isRetryableEmailFailure(email.failureCode, email.attemptCount));
  if (!allowed) {
    return {
      success: false,
      error:
        action === "RETRY"
          ? "This failure is not classified as retryable or has reached the attempt limit"
          : "This email is not scheduled for an eligible retry",
    };
  }

  const payload = parseJson<StoredEmailPayload>(email.payloadJson);
  const attachments = parseJson<Array<{ fileName: string }>>(email.attachmentsJson) || [];
  if (!payload || attachments.length !== (payload.attachments?.length || 0)) {
    return { success: false, error: "Stored email or attachment content is unavailable; this email cannot be retried" };
  }

  const updated = await prisma.emailLog.updateMany({
    where: {
      id,
      status: email.status,
      attemptCount: email.attemptCount,
      ...(action === "SEND_NOW" ? { nextRetryAt: { not: null } } : {}),
    },
    data: {
      status: "QUEUED",
      nextRetryAt: new Date(),
      failedAt: null,
      processingStartedAt: null,
    },
  });
  if (!updated.count) return { success: false, error: "Communication changed state before it could be retried" };

  const outcome = await processEmailQueueItem(id, "MANUAL_RETRY");
  const latest = await prisma.emailLog.findUnique({
    where: { id },
    select: { status: true, lastError: true, nextRetryAt: true },
  });
  return {
    success: outcome !== "FAILED" && outcome !== "SKIPPED",
    status: latest?.status || outcome,
    nextRetryAt: latest?.nextRetryAt?.toISOString() || null,
    error: latest?.lastError || (outcome === "SKIPPED" ? "Email could not be claimed for sending" : undefined),
  };
}

export async function retryAllEligibleEmails() {
  await ensureMarketplaceFoundationSchema();
  const now = new Date();
  const where = {
    status: "FAILED",
    failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] },
    attemptCount: { lt: MAX_EMAIL_ATTEMPTS },
    payloadJson: { not: null },
  };
  const updated = await prisma.emailLog.updateMany({
    where,
    data: { status: "QUEUED", nextRetryAt: now, failedAt: null },
  });
  const processed = await processEmailQueue(25);
  return {
    eligible: updated.count,
    queued: updated.count,
    skipped: 0,
    processed: processed.processed,
    failed: processed.failed,
  };
}

export async function queueSelectedEmailRetries(ids: string[]) {
  await ensureMarketplaceFoundationSchema();
  const where = {
    id: { in: [...new Set(ids)] },
    status: "FAILED",
    failureCode: { in: [...TRANSIENT_EMAIL_FAILURE_CODES] },
    attemptCount: { lt: MAX_EMAIL_ATTEMPTS },
    payloadJson: { not: null },
  };
  const updated = await prisma.emailLog.updateMany({
    where,
    data: { status: "QUEUED", nextRetryAt: new Date(), failedAt: null },
  });
  const processed = await processEmailQueue(Math.min(ids.length, 25));
  return {
    queued: updated.count,
    skipped: ids.length - updated.count,
    processed: processed.processed,
    failed: processed.failed,
  };
}

async function processQueuedEmail(
  id: string,
  triggeredBy: EmailAttemptRecord["triggeredBy"],
): Promise<"SENT" | "QUEUED" | "RETRY" | "FAILED" | "SKIPPED"> {
  const now = new Date();
  const claim = await prisma.emailLog.updateMany({
    where: {
      id,
      direction: "OUTBOUND",
      status: "QUEUED",
      nextRetryAt: { lte: now },
    },
    data: {
      status: "PROCESSING",
      processingStartedAt: now,
      lastAttemptAt: now,
      attemptCount: { increment: 1 },
      nextRetryAt: null,
    },
  });
  if (claim.count !== 1) return "SKIPPED";

  const email = await prisma.emailLog.findUnique({
    where: { id },
    select: {
      id: true,
      recipient: true,
      subject: true,
      bodyHtml: true,
      bodyText: true,
      attachmentsJson: true,
      payloadJson: true,
      retryHistoryJson: true,
      attemptCount: true,
      messageId: true,
      inReplyTo: true,
      referencesJson: true,
    },
  });
  if (!email) throw new Error(`Claimed email ${id} could not be loaded`);

  const history = parseJson<EmailAttemptRecord[]>(email.retryHistoryJson) || [];
  const persistedPayload = parseJson<StoredEmailPayload>(email.payloadJson);
  const metadata = parseJson<Array<{ fileName: string; mimeType: string }>>(email.attachmentsJson) || [];
  const nowIso = now.toISOString();
  let message: EmailMessage | null = null;
  let validationError: string | null = null;

  if (!email.recipient.trim()) validationError = "Missing recipient address";
  else if (!email.bodyHtml && !email.bodyText) validationError = "Missing email body content";
  else if (!persistedPayload && metadata.length) validationError = "Missing attachment payload";
  else if (
    metadata.length &&
    (persistedPayload?.attachments?.length || 0) !== metadata.length
  ) {
    validationError = "Missing attachment payload";
  } else {
    const references = parseJson<string[]>(email.referencesJson) || [];
    message = {
      to: email.recipient,
      subject: email.subject,
      ...(email.bodyHtml ? { html: email.bodyHtml } : {}),
      ...(email.bodyText ? { text: email.bodyText } : {}),
      cc: persistedPayload?.cc,
      bcc: persistedPayload?.bcc,
      attachments: parseStoredAttachments(persistedPayload || {}),
      messageId: email.messageId ?? undefined,
      inReplyTo: email.inReplyTo ?? undefined,
      references,
    };
  }

  let providerName: string | undefined;
  let providerMessageId: string | undefined;
  let providerStatus: "SENT" | "QUEUED" | "FAILED" = "FAILED";
  let errorMessage = validationError || "";
  if (!validationError && message) {
    try {
      const provider = resolveEmailProvider();
      providerName = provider.name;
      const result = await provider.send(message);
      providerStatus = result.status;
      providerMessageId = result.providerMessageId;
      errorMessage = result.error || "";
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }
  }

  if (providerStatus === "SENT") {
    await prisma.emailLog.update({
      where: { id },
      data: {
        status: "SENT",
        provider: providerName,
        providerMessageId: providerMessageId ?? null,
        sentAt: now,
        failedAt: null,
        processingStartedAt: null,
        nextRetryAt: null,
        lastError: null,
        failureCode: null,
        errorMessage: null,
        retryHistoryJson: appendAttempt(history, {
          attempt: email.attemptCount,
          at: nowIso,
          status: "SENT",
          providerMessageId,
          triggeredBy,
        }),
      },
    });
    return "SENT";
  }

  if (providerStatus === "QUEUED" && !errorMessage) {
    await prisma.emailLog.update({
      where: { id },
      data: {
        status: "QUEUED",
        provider: providerName,
        providerMessageId: providerMessageId ?? null,
        processingStartedAt: null,
        nextRetryAt: null,
        failedAt: null,
        lastError: null,
        failureCode: null,
        errorMessage: null,
        retryHistoryJson: appendAttempt(history, {
          attempt: email.attemptCount,
          at: nowIso,
          status: "QUEUED",
          providerMessageId,
          triggeredBy,
        }),
      },
    });
    return "QUEUED";
  }

  const failureCode = classifyEmailFailure(errorMessage || "Email provider failed without an error message");
  const nextAttemptAt = isRetryableEmailFailure(failureCode, email.attemptCount)
    ? retryAt(email.attemptCount, now)
    : null;
  const willRetry = nextAttemptAt !== null;
  await prisma.emailLog.update({
    where: { id },
    data: {
      status: willRetry ? "QUEUED" : "FAILED",
      provider: providerName,
      providerMessageId: null,
      processingStartedAt: null,
      nextRetryAt: nextAttemptAt,
      failedAt: willRetry ? null : now,
      lastError: errorMessage,
      errorMessage,
      failureCode,
      retryHistoryJson: appendAttempt(history, {
        attempt: email.attemptCount,
        at: nowIso,
        status: "FAILED",
        failureCode,
        error: errorMessage,
        triggeredBy,
      }),
    },
  });
  return willRetry ? "RETRY" : "FAILED";
}

export async function processEmailQueue(limit = 25): Promise<EmailQueueResult> {
  await ensureMarketplaceFoundationSchema();
  const now = new Date();
  const emails = await prisma.emailLog.findMany({
    where: {
      direction: "OUTBOUND",
      status: "QUEUED",
      nextRetryAt: { lte: now },
    },
    select: { id: true },
    orderBy: [{ nextRetryAt: "asc" }, { createdAt: "asc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });

  const result: EmailQueueResult = {
    scanned: emails.length,
    processed: 0,
    sent: 0,
    providerQueued: 0,
    retryScheduled: 0,
    failed: 0,
    skipped: 0,
  };
  for (const email of emails) {
    const outcome = await processQueuedEmail(email.id, "AUTOMATIC_RETRY");
    if (outcome === "SKIPPED") {
      result.skipped += 1;
      continue;
    }
    result.processed += 1;
    if (outcome === "SENT") result.sent += 1;
    else if (outcome === "QUEUED") result.providerQueued += 1;
    else if (outcome === "RETRY") result.retryScheduled += 1;
    else result.failed += 1;
  }
  return result;
}

export async function processEmailQueueItem(
  id: string,
  triggeredBy: "SEND" | "MANUAL_RETRY",
): Promise<"SENT" | "QUEUED" | "RETRY" | "FAILED" | "SKIPPED"> {
  await ensureMarketplaceFoundationSchema();
  return processQueuedEmail(id, triggeredBy);
}
