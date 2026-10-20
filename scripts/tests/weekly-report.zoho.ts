import assert from "node:assert/strict";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
async function main() {
 const connector = new ZohoMailConnector();
 Reflect.set(connector, "isConfigured", () => true);
 Reflect.set(connector, "getAccessToken", async () => "synthetic-test-token");
 Reflect.set(connector, "getAccount", async () => ({ accountId: "test", primaryEmailAddress: "sender@example.com" }));
 const original = globalThis.fetch; let sent = 0, uploads = 0, mode = "success";
 globalThis.fetch = async (url, init) => {
  if (String(url).includes("/attachments?")) { uploads++; return Response.json({ data: mode === "bad-upload" ? {} : { storeName: "store", attachmentPath: "/test", attachmentName: "test.pdf" } }); }
  sent++; const payload = JSON.parse(String(init?.body)); assert.equal(payload.attachments.length, 1);
  if (mode === "network") throw new Error("sensitive synthetic failure body must not escape");
  if (mode === "rate") return Response.json({ message: "sensitive provider response" }, { status: 429, headers: { "retry-after": "120" } });
  return Response.json({ data: { messageId: "test-message" } });
 };
 const message = { to: "recipient@example.com", subject: "TEST", text: "Synthetic test", attachments: [{ fileName: "test.pdf", mimeType: "application/pdf", content: Buffer.from("%PDF-test") }] };
 try {
  assert.equal((await connector.send(message)).providerMessageId, "test-message"); assert.equal(sent, 1); assert.equal(uploads, 1);
  mode = "bad-upload"; const bad = await connector.send(message); assert.equal(bad.status, "FAILED"); assert.equal(sent, 1, "Never send without a required uploaded attachment");
  mode = "network"; const unknown = await connector.send(message); assert.equal(unknown.outcomeUnknown, true); assert.equal(sent, 2, "Do not automatically repeat an ambiguous POST"); assert.ok(!unknown.error?.includes("sensitive"));
  mode = "rate"; const rate = await connector.send(message); assert.equal(rate.retryable, true); assert.equal(rate.retryAfterSeconds, 120); assert.equal(sent, 3); assert.ok(!rate.error?.includes("sensitive"));
  console.log("Zoho report delivery contract passed: upload metadata required, PDF attached, message ID captured, ambiguous POST submitted once, 429 Retry-After retained and provider details redacted. All HTTP calls mocked.");
 } finally { globalThis.fetch = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
