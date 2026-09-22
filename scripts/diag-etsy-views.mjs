import { config } from "dotenv";
import crypto from "node:crypto";
config({ path: ".env.local" });
config({ path: ".env" });

const rawUrl = process.env.DATABASE_URL || "";
let url = rawUrl;
let authToken = process.env.TURSO_AUTH_TOKEN || process.env.TURSO_TOKEN;
if (rawUrl.startsWith("https://")) url = rawUrl.replace(/^https:\/\//, "libsql://");
const [base, query = ""] = url.split("?");
if (!authToken) authToken = new URLSearchParams(query).get("authToken") ?? undefined;
url = base;

const { createClient } = await import("@libsql/client");
const db = createClient({ url, authToken });
const conn = await db.execute(`SELECT "tokenRef" FROM "MarketplaceConnection" WHERE "marketplace" = 'ETSY' LIMIT 1`);
const parts = conn.rows[0].tokenRef.split(":");
const key = crypto.createHash("sha256").update(process.env.ERP_SECRET_ENCRYPTION_KEY || "").digest();
const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(parts[0], "base64"));
d.setAuthTag(Buffer.from(parts[1], "base64"));
const tokens = JSON.parse(Buffer.concat([d.update(Buffer.from(parts[2], "base64")), d.final()]).toString("utf8"));
const refreshRes = await fetch("https://api.etsy.com/v3/public/oauth/token", {
  method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.ETSY_CLIENT_ID, refresh_token: tokens.refreshToken }).toString(),
});
const token = (await refreshRes.json()).access_token || tokens.accessToken;
const headers = { "x-api-key": `${process.env.ETSY_CLIENT_ID}:${process.env.ETSY_SHARED_SECRET}`, Authorization: `Bearer ${token}`, Accept: "application/json" };
const userId = String(token).split(".")[0];
const shop = await (await fetch(`https://openapi.etsy.com/v3/application/users/${userId}/shops`, { headers })).json();

const listRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${shop.shop_id}/listings?state=active&limit=1`, { headers });
const listData = await listRes.json();
const l = (listData.results || [])[0];
console.log("LISTING KEYS:", l ? Object.keys(l).join(", ") : "none");
const lid = l?.listing_id;
console.log("\nlisting_id:", lid);

if (lid) {
  const statsRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${lid}/stats`, { headers });
  const statsData = await statsRes.text();
  console.log("/listings/{id}/stats:", statsRes.status, statsData.slice(0, 500));
}

await db.close();
