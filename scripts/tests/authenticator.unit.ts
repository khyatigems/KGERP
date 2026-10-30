import assert from "node:assert/strict";
import { matchingTotpStep, newAuthenticatorSecret, totpCode } from "@/lib/security/totp";

// RFC 6238 Appendix B: the ASCII secret "12345678901234567890", base32 encoded.
const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
for (const [seconds, expected] of [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]] as const) {
  assert.equal(totpCode(secret, Math.floor(seconds / 30), 8), expected);
}
const now = 1_800_000_000_000, step = now / 30_000;
for (const offset of [-1, 0, 1]) assert.equal(matchingTotpStep(secret, totpCode(secret, step + offset), now), step + offset);
assert.equal(matchingTotpStep(secret, totpCode(secret, step - 2), now), null);
assert.equal(matchingTotpStep(secret, "12 3456", now), null);
assert.equal(matchingTotpStep(secret, "12345", now), null);
const secrets = Array.from({ length: 50 }, newAuthenticatorSecret);
assert.equal(new Set(secrets).size, 50);
assert.ok(secrets.every(value => /^[A-Z2-7]{32}$/.test(value)));
console.log("Authenticator unit checks passed: RFC vectors, leading zeros, time skew, malformed codes and random per-account secrets.");
