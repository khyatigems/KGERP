import assert from "node:assert/strict";
import { HttpError, httpRequest } from "../../lib/marketplace/http";

async function main() {
  const originalFetch = globalThis.fetch;
  try {
    let calls = 0;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ errors: [
        { message: "Invalid request", longMessage: "The selected condition is invalid for this category." },
        { message: "A shipping policy is required." },
      ] }), { status: 400 });
    };
    await assert.rejects(httpRequest("https://example.com/inventory", { method: "PUT" }), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.status, 400);
      assert.equal(error.message, "HTTP 400: The selected condition is invalid for this category.; A shipping policy is required.");
      assert.ok(error.body);
      return true;
    });
    assert.equal(calls, 1, "Do not retry validation failures");
    assert.equal(new HttpError("HTTP 400", 400, { error: "invalid_grant", error_description: "Reconnect the shop." }).message, "HTTP 400: Reconnect the shop.");
    globalThis.fetch = async () => new Response("<html>Unavailable</html>", { status: 502 });
    await assert.rejects(httpRequest("https://example.com/inventory", {}, { maxRetries: 0 }), (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.message, "HTTP 502");
      assert.equal(error.body, "<html>Unavailable</html>");
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  console.log("Marketplace HTTP unit tests passed.");
}

void main();
