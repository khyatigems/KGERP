import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  parseResendTrackedEvent,
  verifyResendWebhookSignature,
} from "@/lib/email/resend-webhook";

const body = JSON.stringify({
  type: "email.delivered",
  created_at: "2026-10-05T08:00:00.000Z",
  data: { email_id: "resend-message-1" },
});
const webhookId = "evt_123";
const timestamp = String(Math.floor(Date.now() / 1000));
const signingKey = Buffer.from("test-webhook-signing-key").toString("base64");
const secret = `whsec_${signingKey}`;
const signature = createHmac("sha256", Buffer.from(signingKey, "base64"))
  .update(`${webhookId}.${timestamp}.${body}`)
  .digest("base64");
const headers = {
  id: webhookId,
  timestamp,
  signature: `v1,${signature}`,
  body,
  secret,
};

assert.equal(verifyResendWebhookSignature(headers), true);
assert.equal(verifyResendWebhookSignature({ ...headers, body: `${body} ` }), false);
assert.equal(verifyResendWebhookSignature({ ...headers, secret: "wrong" }), false);
assert.equal(
  verifyResendWebhookSignature({
    ...headers,
    timestamp: String(Number(timestamp) - 600),
  }),
  false,
);

const tracked = parseResendTrackedEvent(JSON.parse(body), webhookId);
assert.equal(tracked?.eventId, webhookId);
assert.equal(tracked?.providerMessageId, "resend-message-1");
assert.equal(tracked?.eventType, "email.delivered");
assert.equal(
  parseResendTrackedEvent({ type: "email.sent" }, webhookId),
  null,
);
assert.equal(
  parseResendTrackedEvent(
    {
      type: "email.bounced",
      created_at: "2026-10-05T08:00:00.000Z",
      data: { email_id: "resend-message-1", bounce: { message: "Mailbox unavailable" } },
    },
    webhookId,
  )?.errorMessage,
  "Mailbox unavailable",
);

console.log("resend-webhook.unit.ts passed");
