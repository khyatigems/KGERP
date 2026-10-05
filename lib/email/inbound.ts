import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import type { InboundEmail, InboundEmailResult } from "./types";
import { ZohoMailConnector } from "./connectors/zoho";
import { htmlToPlainText } from "./content";

export type { InboundEmail, InboundEmailResult } from "./types";

const INBOUND_EMAIL_LOG_COLUMNS: Array<[string, string]> = [
  ["cc", `"cc" TEXT`],
  ["bodyRef", `"bodyRef" TEXT`],
  ["threadId", `"threadId" TEXT`],
  ["messageId", `"messageId" TEXT`],
  ["inReplyTo", `"inReplyTo" TEXT`],
  ["referencesJson", `"referencesJson" TEXT`],
  ["emailType", `"emailType" TEXT`],
  ["direction", `"direction" TEXT NOT NULL DEFAULT 'OUTBOUND'`],
  ["providerMessageId", `"providerMessageId" TEXT`],
  ["bodyHtml", `"bodyHtml" TEXT`],
  ["bodyText", `"bodyText" TEXT`],
  ["lastError", `"lastError" TEXT`],
  ["receivedAt", `"receivedAt" DATETIME`],
  ["isRead", `"isRead" INTEGER NOT NULL DEFAULT 1`],
];

async function ensureInboundEmailLogSchema(): Promise<void> {
  await ensureMarketplaceFoundationSchema();
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("EmailLog")`);
  const existing = new Set(columns.map((column) => column.name));
  for (const [name, definition] of INBOUND_EMAIL_LOG_COLUMNS) {
    if (existing.has(name)) continue;
    await prisma.$executeRawUnsafe(`ALTER TABLE "EmailLog" ADD COLUMN ${definition}`);
  }
  const verifiedColumns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info("EmailLog")`);
  const verified = new Set(verifiedColumns.map((column) => column.name));
  const missing = INBOUND_EMAIL_LOG_COLUMNS.map(([name]) => name).filter((name) => !verified.has(name));
  if (missing.length) {
    throw new Error(`EmailLog schema is missing required inbound email columns: ${missing.join(", ")}`);
  }
}

function summarizeInboundError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lines = message.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const diagnostic = lines.find((line) =>
    /unknown argument|does not exist|no such column|P\d{4}|unique constraint|foreign key constraint|argument .+ required/i.test(line)
  );
  return (diagnostic || lines.slice(-2).join(" ")).slice(0, 500);
}

export function parseInboundEmail(payload: unknown): InboundEmail | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const p = payload as Record<string, unknown>;
  if (typeof p.from !== "string") return null;
  let receivedAt: Date | null = null;
  if (p.receivedAt instanceof Date && !Number.isNaN(p.receivedAt.getTime())) receivedAt = p.receivedAt;
  else if (typeof p.receivedAt === "string" || typeof p.receivedAt === "number") {
    const raw = p.receivedAt;
    const numeric = typeof raw === "number" || (typeof raw === "string" && /^\d+$/.test(raw))
      ? Number(raw)
      : null;
    const parsed = numeric === null
      ? new Date(raw)
      : new Date(numeric < 100_000_000_000 ? numeric * 1000 : numeric);
    if (!Number.isNaN(parsed.getTime())) receivedAt = parsed;
  }
  return {
    providerMessageId: typeof p.providerMessageId === "string" ? p.providerMessageId : "",
    from: p.from,
    cc: typeof p.cc === "string" ? p.cc : null,
    subject: typeof p.subject === "string" ? p.subject : "(no subject)",
    textBody: typeof p.textBody === "string" ? p.textBody : null,
    htmlBody: typeof p.htmlBody === "string" ? p.htmlBody : null,
    contentError: typeof p.contentError === "string" ? p.contentError : null,
    receivedAt,
    references: Array.isArray(p.references) ? p.references.map((reference) => String(reference)) : [],
    inReplyTo: typeof p.inReplyTo === "string" ? p.inReplyTo : null,
    messageId: typeof p.messageId === "string" ? p.messageId : null,
  };
}

function extractEmailAddress(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim().toLowerCase();
}

function matchInvoiceFromSubject(subject: string): string | null {
  const match = subject.match(/INV-\d{4}-\d+/i);
  return match ? match[0].toUpperCase() : null;
}

function isHtmlContent(value: string | null): boolean {
  return Boolean(value && /<(?:html|body|div|p|br|table|style|span)\b/i.test(value));
}

async function findCustomerByEmail(email: string) {
  if (!email) return null;
  const customers = await prisma.customer.findMany({
    where: { email: { contains: email } },
    take: 1,
  });
  return customers[0] ?? null;
}

/**
 * Store an inbound email and match it to a customer (by from-address) and,
 * when possible, an invoice (by invoice number in the subject). Idempotent on
 * the provider message id so re-running inbox polling never duplicates.
 */
export async function handleInboundEmail(email: InboundEmail): Promise<InboundEmailResult> {
  if (!email.providerMessageId) {
    return { matchedCustomerId: null, matchedOrderId: null, handled: false, created: false, updated: false };
  }

  await ensureInboundEmailLogSchema();
  const existing = await prisma.emailLog.findFirst({
    where: { providerMessageId: email.providerMessageId, direction: "INBOUND" },
    select: { id: true, customerId: true, orderId: true, bodyHtml: true, bodyText: true, lastError: true },
  });
  if (existing) {
    const needsEnrichment = (!existing.bodyHtml && email.htmlBody) ||
      (!existing.bodyText && email.textBody) ||
      (!existing.lastError && email.contentError);
    if (email.receivedAt) {
      await prisma.$executeRawUnsafe(
        `UPDATE "EmailLog"
         SET "receivedAt" = ?, "createdAt" = ?
         WHERE "id" = ? AND "direction" = 'INBOUND' AND "receivedAt" IS NULL`,
        email.receivedAt.toISOString(),
        email.receivedAt.toISOString(),
        existing.id,
      );
    }
    if (needsEnrichment) {
      await prisma.emailLog.update({
        where: { id: existing.id },
        data: {
          ...(!existing.bodyHtml && email.htmlBody ? { bodyHtml: email.htmlBody } : {}),
          ...(!existing.bodyText && email.textBody
            ? { bodyText: email.textBody }
            : isHtmlContent(existing.bodyText) && email.htmlBody
              ? { bodyText: email.textBody ?? htmlToPlainText(email.htmlBody) }
              : {}),
          ...(!existing.bodyText && !existing.bodyHtml ? { bodyRef: email.textBody ?? email.htmlBody ?? undefined } : {}),
          ...(!existing.lastError && email.contentError ? { lastError: email.contentError } : {}),
        },
      });
    }
    return {
      matchedCustomerId: existing.customerId,
      matchedOrderId: existing.orderId,
      handled: true,
      created: false,
      updated: Boolean(needsEnrichment),
    };
  }

  const fromAddress = extractEmailAddress(email.from);
  const customer = await findCustomerByEmail(fromAddress);
  const referenceIds = [...email.references, ...(email.inReplyTo ? [email.inReplyTo] : [])]
    .map((value) => value.trim().replace(/^<|>$/g, ""))
    .filter(Boolean);
  const referencedMessages = referenceIds.length
    ? await prisma.emailLog.findMany({
        where: {
          OR: [
            { messageId: { in: referenceIds.map((value) => `<${value}>`) } },
            { messageId: { in: referenceIds } },
            { providerMessageId: { in: referenceIds } },
          ],
        },
        select: { threadId: true, id: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      })
    : [];
  const threadId = referencedMessages[0]?.threadId || referencedMessages[0]?.id || crypto.randomUUID();

  let orderId: string | null = null;
  const invoiceNumber = matchInvoiceFromSubject(email.subject);
  if (invoiceNumber) {
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    orderId = invoice?.id ?? null;
  }

  const createdEmailLog = await prisma.emailLog.create({
    data: {
      id: crypto.randomUUID(),
      customerId: customer?.id ?? null,
      orderId,
      recipient: email.from,
      cc: email.cc ?? null,
      subject: email.subject,
      bodyRef: email.textBody ?? email.htmlBody ?? null,
      bodyHtml: email.htmlBody,
      bodyText: email.textBody,
      lastError: email.contentError,
      ...(email.receivedAt ? { createdAt: email.receivedAt } : {}),
      threadId,
      messageId: email.messageId ?? null,
      inReplyTo: email.inReplyTo ?? null,
      referencesJson: JSON.stringify(email.references),
      emailType: "INBOUND",
      direction: "INBOUND",
      provider: "zoho",
      providerMessageId: email.providerMessageId,
      status: "RECEIVED",
      isRead: false,
    },
  });
  if (email.receivedAt) {
    await prisma.$executeRawUnsafe(
      `UPDATE "EmailLog" SET "receivedAt" = ? WHERE "id" = ?`,
      email.receivedAt.toISOString(),
      createdEmailLog.id,
    );
  }

  return { matchedCustomerId: customer?.id ?? null, matchedOrderId: orderId, handled: true, created: true, updated: false };
}

/**
 * Poll the Zoho Mail inbox and store new replies as inbound communication
 * records (Phase 14). Safe to call repeatedly; deduped by provider message id.
 */
export async function pollZohoInbox(limit = 50): Promise<{
  found: number;
  processed: number;
  updated: number;
  alreadySynced: number;
  failed: number;
  failedErrors: string[];
  contentMissing: number;
  contentWarning?: string;
  error?: string;
}> {
  const connector = new ZohoMailConnector();
  if (!connector.isConfigured()) {
    return { found: 0, processed: 0, updated: 0, alreadySynced: 0, failed: 0, failedErrors: [], contentMissing: 0, error: "Zoho Mail is not configured" };
  }
  let messages: InboundEmail[];
  try {
    messages = await connector.fetchInbox(limit);
  } catch (error) {
    const err = error as { message?: string; body?: unknown; status?: number };
    const detail = err.body ? JSON.stringify(err.body) : "";
    console.error("[zoho] inbox fetch failed:", err.message, detail);
    return {
      found: 0,
      processed: 0,
      updated: 0,
      alreadySynced: 0,
      failed: 0,
      failedErrors: [],
      contentMissing: 0,
      error: detail ? `${err.message} — ${detail}` : (err.message ?? String(error)),
    };
  }

  let processed = 0;
  let updated = 0;
  let alreadySynced = 0;
  let failed = 0;
  let contentMissing = 0;
  const failedErrors: string[] = [];
  for (const message of messages) {
    if (!message.textBody && !message.htmlBody) contentMissing += 1;
    const result = await handleInboundEmail(message).catch((error: unknown) => {
      console.error("[email-inbound] Failed to store an inbox message:", error);
      const reason = summarizeInboundError(error);
      if (!failedErrors.includes(reason) && failedErrors.length < 3) failedErrors.push(reason);
      return null;
    });
    if (!result?.handled) {
      failed += 1;
    } else if (result.created) {
      processed += 1;
    } else if (result.updated) {
      updated += 1;
    } else {
      alreadySynced += 1;
    }
  }
  const error = failed
    ? `Failed to import ${failed} of ${messages.length} messages.${failedErrors[0] ? ` First error: ${failedErrors[0]}` : " The provider returned a message without a usable ID."}`
    : undefined;
  const contentWarning = contentMissing
    ? `${contentMissing} message(s) have no readable body from Zoho. Check the message detail for its content-fetch error.`
    : undefined;
  return { found: messages.length, processed, updated, alreadySynced, failed, failedErrors, contentMissing, contentWarning, error };
}
