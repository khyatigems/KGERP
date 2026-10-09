import assert from "node:assert/strict";
import { EBAY_INVENTORY_WRITE_SCOPE, hasOAuthScope, resolveOAuthScopes } from "../../lib/marketplace/scopes";

assert.equal(resolveOAuthScopes(undefined, EBAY_INVENTORY_WRITE_SCOPE), EBAY_INVENTORY_WRITE_SCOPE);
assert.equal(resolveOAuthScopes("listings_r", "listings_r listings_w"), "listings_r");
assert.equal(resolveOAuthScopes("", "listings_w"), "");
assert.equal(resolveOAuthScopes(undefined, null), null);
assert.equal(hasOAuthScope("listings_r\nlistings_w", "listings_w"), true);
assert.equal(hasOAuthScope(`${EBAY_INVENTORY_WRITE_SCOPE}.readonly`, EBAY_INVENTORY_WRITE_SCOPE), false);

async function main() {
  const { prisma } = await import("../../lib/prisma");
  const { EbayConnector } = await import("../../lib/marketplace/connectors/ebay");
  const { encryptSecret, decryptSecret } = await import("../../lib/security/secret-store");
  const { saveTokens } = await import("../../lib/marketplace/oauth");
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ERP_SECRET_ENCRYPTION_KEY;
  const originalFind = prisma.marketplaceConnection.findUnique;
  const originalUpdate = prisma.marketplaceConnection.update;
  const originalUpsert = prisma.marketplaceConnection.upsert;
  process.env.ERP_SECRET_ENCRYPTION_KEY = "scope-test-encryption-key-only";
  let tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-access", refreshToken: "test-refresh", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
  let savedScopes: string | null = null;
  let calls = 0;
  try {
    prisma.marketplaceConnection.findUnique = (async () => ({ tokenRef })) as unknown as typeof originalFind;
    prisma.marketplaceConnection.update = (async (args: { data: { tokenRef: string; scopes: string } }) => {
      tokenRef = args.data.tokenRef;
      savedScopes = args.data.scopes;
      return {};
    }) as unknown as typeof originalUpdate;
    globalThis.fetch = async (url, init) => {
      calls += 1;
      assert.match(String(url), /\/token\/introspect$/);
      assert.equal(new URLSearchParams(String(init?.body)).get("token"), "test-access");
      return new Response(JSON.stringify({ active: true, scope: EBAY_INVENTORY_WRITE_SCOPE }));
    };
    const connector = new EbayConnector();
    const introspectionFetch = globalThis.fetch;
    globalThis.fetch = async (url) => String(url).endsWith("/ws/api.dll")
      ? new Response("<GetUserResponse><User><UserID>test-seller</UserID></User></GetUserResponse>")
      : new Response(JSON.stringify({ access_token: "test-access", refresh_token: "test-refresh", expires_in: 7200 }));
    const grant = await connector.exchangeAuthorizationCode("test-code");
    assert.equal(hasOAuthScope(grant.tokens.scope, EBAY_INVENTORY_WRITE_SCOPE), true, "eBay token responses without scope retain the consent scope");
    globalThis.fetch = introspectionFetch;
    assert.equal(await connector.ensureInventoryWriteScope("test-connection", null), true);
    assert.equal(savedScopes, EBAY_INVENTORY_WRITE_SCOPE);
    assert.equal(JSON.parse(decryptSecret(tokenRef)!).scope, EBAY_INVENTORY_WRITE_SCOPE);
    assert.equal(await connector.ensureInventoryWriteScope("test-connection", savedScopes), true);
    assert.equal(calls, 1, "Persisted permissions avoid another verification request");
    assert.equal(await connector.ensureInventoryWriteScope("test-connection", `${EBAY_INVENTORY_WRITE_SCOPE}.readonly`), false);
    tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-access", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
    globalThis.fetch = async () => new Response(JSON.stringify({ active: true, scope: `${EBAY_INVENTORY_WRITE_SCOPE}.readonly` }));
    assert.equal(await connector.ensureInventoryWriteScope("test-connection", null), false);
    assert.equal(savedScopes, `${EBAY_INVENTORY_WRITE_SCOPE}.readonly`);
    tokenRef = encryptSecret(JSON.stringify({ accessToken: "test-access", expiresAt: new Date(Date.now() + 3600000).toISOString() }));
    globalThis.fetch = async () => new Response(JSON.stringify({ active: false }));
    await assert.rejects(connector.ensureInventoryWriteScope("test-connection", null), /could not verify/);
    prisma.marketplaceConnection.upsert = (async (args: { update: { oauthAppProfile?: string; scopes?: string } }) => {
      assert.equal(args.update.oauthAppProfile, "ETSY_SECONDARY");
      assert.equal(args.update.scopes, "listings_r listings_w");
      return { id: "test-etsy" };
    }) as unknown as typeof originalUpsert;
    assert.equal(await saveTokens("ETSY", "test-account", "Test", { accessToken: "test", scope: "listings_r listings_w" }, { oauthAppProfile: "ETSY_SECONDARY" }), "test-etsy");
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.ERP_SECRET_ENCRYPTION_KEY;
    else process.env.ERP_SECRET_ENCRYPTION_KEY = originalKey;
    prisma.marketplaceConnection.findUnique = originalFind;
    prisma.marketplaceConnection.update = originalUpdate;
    prisma.marketplaceConnection.upsert = originalUpsert;
  }
  console.log("Marketplace OAuth scope regression tests passed.");
}

void main();
