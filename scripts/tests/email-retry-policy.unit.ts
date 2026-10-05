import assert from "node:assert/strict";
import {
  classifyEmailFailure,
  EMAIL_RETRY_DELAYS_MS,
  isRetryableEmailFailure,
  MAX_EMAIL_ATTEMPTS,
  retryDelayMs,
} from "../../lib/email/retry-policy";

assert.equal(MAX_EMAIL_ATTEMPTS, 5);
assert.deepEqual(EMAIL_RETRY_DELAYS_MS, [300_000, 1_800_000, 7_200_000, 21_600_000]);
assert.equal(retryDelayMs(1), 300_000);
assert.equal(retryDelayMs(2), 1_800_000);
assert.equal(retryDelayMs(3), 7_200_000);
assert.equal(retryDelayMs(4), 21_600_000);
assert.equal(retryDelayMs(5), null);

assert.equal(classifyEmailFailure("Invalid recipient email address"), "INVALID_MESSAGE");
assert.equal(classifyEmailFailure("Zoho Mail client credentials not configured"), "PROVIDER_AUTH");
assert.equal(classifyEmailFailure("HTTP 429 rate limit exceeded"), "RATE_LIMITED");
assert.equal(classifyEmailFailure("Request timed out"), "TIMEOUT");
assert.equal(classifyEmailFailure("HTTP 408 request timeout"), "TIMEOUT");
assert.equal(classifyEmailFailure("HTTP 503 service unavailable"), "NETWORK_ERROR");
assert.equal(classifyEmailFailure("HTTP 400 sender was rejected"), "PROVIDER_REJECTION");
assert.equal(classifyEmailFailure("Unclassified provider response"), "PROVIDER_REJECTION");

assert.equal(isRetryableEmailFailure("NETWORK_ERROR", 1), true);
assert.equal(isRetryableEmailFailure("RATE_LIMITED", 4), true);
assert.equal(isRetryableEmailFailure("TIMEOUT", 5), false);
assert.equal(isRetryableEmailFailure("PROVIDER_AUTH", 1), false);
assert.equal(isRetryableEmailFailure(null, 1), false);

console.log("email-retry-policy.unit.ts passed");
