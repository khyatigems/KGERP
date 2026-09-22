import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import type { InboundEmail, InboundEmailResult } from "./types";
import { ZohoMailConnector } from "./connectors/zoho";

export type { InboundEmail, InboundEmailResult } from "./types";

export function parseInboundEmail(payload: unknown): InboundEmail | null {
  const p = payload as Record<string, any> | null;
  if (!p || typeof p.from !== "string") return null;
  return {
    providerMessageId: typeof p.providerMessageId === "string" ? p.providerMessageId : "",
    from: p.from,
    subject: typeof p.subject === "string" ? p.subject : "(no subject)",
    textBody: typeof p.textBody === "string" ? p.textBody : null,
    htmlBody: typeof p.htmlBody === "string" ? p.htmlBody : null,
    receivedAt: p.receivedAt ? new Date(p.receivedAt) : new Date(),
    references: Array.isArray(p.references) ? p.references.map(String) : [],
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
    return { matchedCustomerId: null, matchedOrderId: null, handled: false };
  }

  const existing = await prisma.emailLog.findFirst({
    where: { providerMessageId: email.providerMessageId, direction: "INBOUND" },
    select: { customerId: true, orderId: true },
  });
  if (existing) {
    return { matchedCustomerId: existing.customerId, matchedOrderId: existing.orderId, handled: true };
  }

  const fromAddress = extractEmailAddress(email.from);
  const customer = await findCustomerByEmail(fromAddress);

  let orderId: string | null = null;
  const invoiceNumber = matchInvoiceFromSubject(email.subject);
  if (invoiceNumber) {
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNumber } });
    orderId = invoice?.id ?? null;
  }

  await prisma.emailLog.create({
    data: {
      id: crypto.randomUUID(),
      customerId: customer?.id ?? null,
      orderId,
      recipient: email.from,
      subject: email.subject,
      bodyRef: email.textBody ?? email.htmlBody ?? null,
      emailType: "INBOUND",
      direction: "INBOUND",
      provider: "zoho",
      providerMessageId: email.providerMessageId,
      status: "DELIVERED",
      deliveredAt: email.receivedAt,
    },
  });

  return { matchedCustomerId: customer?.id ?? null, matchedOrderId: orderId, handled: true };
}

/**
 * Poll the Zoho Mail inbox and store new replies as inbound communication
 * records (Phase 14). Safe to call repeatedly; deduped by provider message id.
 */
export async function pollZohoInbox(limit = 50): Promise<{ processed: number; error?: string }> {
  const connector = new ZohoMailConnector();
  if (!connector.isConfigured()) {
    return { processed: 0, error: "Zoho Mail is not configured" };
  }
  let messages: InboundEmail[];
  try {
    messages = await connector.fetchInbox(limit);
  } catch (error) {
    const err = error as { message?: string; body?: unknown; status?: number };
    const detail = err.body ? JSON.stringify(err.body) : "";
    console.error("[zoho] inbox fetch failed:", err.message, detail);
    return {
      processed: 0,
      error: detail ? `${err.message} — ${detail}` : (err.message ?? String(error)),
    };
  }

  let processed = 0;
  for (const message of messages) {
    const result = await handleInboundEmail(message).catch(() => null);
    if (result?.handled) processed += 1;
  }
  return { processed };
}
