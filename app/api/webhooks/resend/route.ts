import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import {
  parseResendTrackedEvent,
  verifyResendWebhookSignature,
} from "@/lib/email/resend-webhook";

const MAX_WEBHOOK_BODY_BYTES = 1024 * 1024;

function isUniqueConstraintError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002",
  );
}

export async function POST(request: NextRequest) {
  const secret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 });
  }
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Webhook body is too large" }, { status: 413 });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Webhook body is too large" }, { status: 413 });
  }
  if (!verifyResendWebhookSignature({
    id: request.headers.get("svix-id"),
    timestamp: request.headers.get("svix-timestamp"),
    signature: request.headers.get("svix-signature"),
    body,
    secret,
  })) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON" }, { status: 400 });
  }
  const eventId = request.headers.get("svix-id")!;
  const event = parseResendTrackedEvent(payload, eventId);
  if (!event) {
    const type =
      payload && typeof payload === "object" && "type" in payload
        ? (payload as { type?: unknown }).type
        : null;
    if (typeof type === "string" && !type.startsWith("email.delivered") &&
      !type.startsWith("email.opened") && !type.startsWith("email.bounced")) {
      return NextResponse.json({ received: true, ignored: true });
    }
    return NextResponse.json({ error: "Invalid tracked email event" }, { status: 400 });
  }

  await ensureMarketplaceFoundationSchema();
  const communication = await prisma.emailLog.findFirst({
    where: { provider: "resend", providerMessageId: event.providerMessageId },
    select: { id: true, status: true, deliveredAt: true, openedAt: true },
  });
  if (!communication) {
    return NextResponse.json({ error: "Communication not found yet; retry delivery" }, { status: 503 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.emailProviderEvent.create({
        data: {
          id: crypto.randomUUID(),
          eventId: event.eventId,
          communicationId: communication.id,
          providerMessageId: event.providerMessageId,
          eventType: event.eventType,
          occurredAt: event.occurredAt,
        },
      });

      if (event.eventType === "email.delivered") {
        await transaction.emailLog.updateMany({
          where: { id: communication.id, status: "SENT", deliveredAt: null },
          data: { status: "DELIVERED", deliveredAt: event.occurredAt },
        });
      } else if (event.eventType === "email.opened") {
        await transaction.emailLog.updateMany({
          where: {
            id: communication.id,
            status: { in: ["SENT", "DELIVERED"] },
            openedAt: null,
          },
          data: {
            status: "OPENED",
            deliveredAt: communication.deliveredAt ?? event.occurredAt,
            openedAt: event.occurredAt,
          },
        });
      } else if (event.eventType === "email.bounced") {
        await transaction.emailLog.updateMany({
          where: { id: communication.id, status: { in: ["SENT", "DELIVERED"] } },
          data: {
            status: "BOUNCED",
            bouncedAt: event.occurredAt,
            failureCode: "PROVIDER_BOUNCED",
            lastError: event.errorMessage || "Resend reported that the email bounced.",
            failedAt: event.occurredAt,
          },
        });
      }
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[resend-webhook] Failed to persist provider event:", error);
    return NextResponse.json({ error: "Could not persist provider event" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
