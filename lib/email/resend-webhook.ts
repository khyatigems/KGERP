import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

export type ResendTrackedEventType =
  | "email.delivered"
  | "email.opened"
  | "email.bounced";

export interface ResendTrackedEvent {
  eventId: string;
  providerMessageId: string;
  eventType: ResendTrackedEventType;
  occurredAt: Date;
  errorMessage?: string;
}

export function verifyResendWebhookSignature(input: {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  secret: string;
  now?: number;
}): boolean {
  const { id, timestamp, signature, secret } = input;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) return false;
  if (!/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor((input.now ?? Date.now()) / 1000);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > SIGNATURE_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const encodedSecret = secret.slice("whsec_".length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encodedSecret)) return false;
  const key = Buffer.from(encodedSecret, "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${input.body}`)
    .digest();

  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
    const received = Buffer.from(value, "base64");
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export function parseResendTrackedEvent(
  payload: unknown,
  eventId: string,
): ResendTrackedEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const event = payload as Record<string, unknown>;
  if (
    event.type !== "email.delivered" &&
    event.type !== "email.opened" &&
    event.type !== "email.bounced"
  ) {
    return null;
  }
  if (!event.data || typeof event.data !== "object" || Array.isArray(event.data)) return null;

  const data = event.data as Record<string, unknown>;
  const providerMessageId =
    typeof data.email_id === "string"
      ? data.email_id
      : typeof data.id === "string"
        ? data.id
        : null;
  if (!providerMessageId || typeof event.created_at !== "string") return null;

  const occurredAt = new Date(event.created_at);
  if (Number.isNaN(occurredAt.getTime())) return null;

  const bounce = data.bounce && typeof data.bounce === "object"
    ? data.bounce as Record<string, unknown>
    : null;
  const errorMessage =
    typeof bounce?.message === "string"
      ? bounce.message.slice(0, 1000)
      : undefined;

  return {
    eventId,
    providerMessageId,
    eventType: event.type,
    occurredAt,
    ...(errorMessage ? { errorMessage } : {}),
  };
}
