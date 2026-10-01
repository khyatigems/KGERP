import assert from "node:assert/strict";
import {
  isEtsyAppProfile,
  normalizeEtsyAppProfile,
  resolveEtsyCredentials,
} from "@/lib/marketplace/connectors/etsy";

const original = { ...process.env };

try {
  process.env.ETSY_CLIENT_ID = "legacy-client";
  process.env.ETSY_SHARED_SECRET = "legacy-secret";
  process.env.ETSY_REDIRECT_URI = "https://erp.example.test/oauth/callback";
  process.env.ETSY_SECONDARY_CLIENT_ID = "secondary-client";
  process.env.ETSY_SECONDARY_SHARED_SECRET = "secondary-secret";
  process.env.ETSY_SECONDARY_REDIRECT_URI = "https://erp.example.test/oauth/callback";

  assert.deepEqual(resolveEtsyCredentials("ETSY_SELLER_LEGACY"), {
    clientId: "legacy-client",
    sharedSecret: "legacy-secret",
    redirectUri: "https://erp.example.test/oauth/callback",
  });
  assert.deepEqual(resolveEtsyCredentials("ETSY_SECONDARY"), {
    clientId: "secondary-client",
    sharedSecret: "secondary-secret",
    redirectUri: "https://erp.example.test/oauth/callback",
  });
  assert.notEqual(
    resolveEtsyCredentials("ETSY_SELLER_LEGACY").clientId,
    resolveEtsyCredentials("ETSY_SECONDARY").clientId,
  );
  assert.equal(normalizeEtsyAppProfile(null), "ETSY_SELLER_LEGACY");
  assert.equal(isEtsyAppProfile("ETSY_SECONDARY"), true);
  assert.equal(isEtsyAppProfile("not-an-etsy-profile"), false);
  assert.throws(() => resolveEtsyCredentials("ETSY_PERSONAL"));
  console.log("Etsy app profile resolver tests passed.");
} finally {
  for (const key of Object.keys(process.env)) {
    if (!(key in original)) delete process.env[key];
  }
  Object.assign(process.env, original);
}
