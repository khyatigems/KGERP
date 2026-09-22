import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

const ENDPOINT_PATH = "/api/ebay/account-deletion";

// Primary endpoint URL (must match what's configured in eBay Developer Portal).
// If erp.khyatigems.com redirects to kgerp.vercel.app, eBay follows the redirect
// and uses the FINAL URL in its hash. We detect this dynamically below.
const PRIMARY_ENDPOINT_URL = "https://www.erp.khyatigems.com/api/ebay/account-deletion";
const REDIRECTED_ENDPOINT_URL = "https://kgerp.vercel.app/api/ebay/account-deletion";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function getVerificationToken(): string | null {
  const token = env("EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN");
  return token || null;
}

function getEbayClientId(): string {
  return env("EBAY_CLIENT_ID");
}

function getEbayClientSecret(): string {
  return env("EBAY_CLIENT_SECRET");
}

function isSandbox(): boolean {
  return env("EBAY_ENVIRONMENT").toLowerCase() !== "production";
}

// ---------------------------------------------------------------------------
// GET — eBay endpoint validation challenge
//
// eBay sends: GET ?challenge_code=<random>
// We respond: SHA-256(challenge_code + verification_token + endpoint_url)
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const challengeCode = request.nextUrl.searchParams.get("challenge_code");
  if (!challengeCode) {
    return NextResponse.json({ error: "Missing challenge_code" }, { status: 400 });
  }

  const verificationToken = getVerificationToken();
  if (!verificationToken) {
    console.error("[ebay-mpn] EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN not configured");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  // Derive the endpoint URL from the actual request host.
  // When erp.khyatigems.com redirects to kgerp.vercel.app, eBay follows the
  // redirect and computes its hash with the final URL. We must match it.
  const host = request.headers.get("host") || "www.erp.khyatigems.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const endpointUrl = `${proto}://${host}${ENDPOINT_PATH}`;

  console.log("[ebay-mpn] Challenge received:", {
    challengeCode,
    host,
    endpointUrl,
    hasToken: Boolean(verificationToken),
    tokenLength: verificationToken.length,
  });

  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpointUrl);
  const challengeResponse = hash.digest("hex");

  console.log("[ebay-mpn] Challenge response sent for endpoint:", endpointUrl);

  return NextResponse.json({ challengeResponse });
}

// ---------------------------------------------------------------------------
// POST — eBay Marketplace Account Deletion notification
//
// 1. Acknowledge receipt immediately (200/204)
// 2. Verify the x-ebay-signature header (ECDSA via eBay public key API)
// 3. Log the notification for audit/compliance
// 4. Anonymize any matching buyer PII in MarketplaceOrder records
// ---------------------------------------------------------------------------

interface EbaySignatureHeader {
  kid: string;
  signature: string;
}

interface EbayNotificationPayload {
  metadata: {
    topic: string;
    schemaVersion: string;
    deprecated: boolean;
  };
  notification: {
    notificationId: string;
    eventDate: string;
    publishDate: string;
    publishAttemptCount: number;
    data: {
      username: string;
      userId: string;
      eiasToken: string;
    };
  };
}

// In-memory cache for eBay public keys (keyed by kid)
const publicKeyCache = new Map<string, { key: string; expiresAt: number }>();
const PUBLIC_KEY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour per eBay recommendation

function decodeSignatureHeader(header: string): EbaySignatureHeader | null {
  try {
    const decoded = Buffer.from(header, "base64").toString("ascii");
    const parsed = JSON.parse(decoded);
    if (parsed.kid && parsed.signature) {
      return { kid: parsed.kid, signature: parsed.signature };
    }
    return null;
  } catch {
    return null;
  }
}

async function getEbayAppToken(): Promise<string | null> {
  const clientId = getEbayClientId();
  const clientSecret = getEbayClientSecret();
  if (!clientId || !clientSecret) return null;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const apiBase = isSandbox() ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";

  try {
    const res = await fetch(`${apiBase}/identity/v1/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body: "grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

async function getPublicKey(kid: string): Promise<string | null> {
  const cached = publicKeyCache.get(kid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.key;
  }

  const appToken = await getEbayAppToken();
  if (!appToken) {
    console.error("[ebay-mpn] Cannot fetch public key: no eBay app token available");
    return null;
  }

  const apiBase = isSandbox() ? "https://api.sandbox.ebay.com" : "https://api.ebay.com";
  try {
    const res = await fetch(`${apiBase}/commerce/notification/v1/public_key/${kid}`, {
      headers: {
        Authorization: `Bearer ${appToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      console.error(`[ebay-mpn] Public key fetch failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    const key: string | undefined = data?.key;
    if (key) {
      publicKeyCache.set(kid, { key, expiresAt: Date.now() + PUBLIC_KEY_CACHE_TTL_MS });
    }
    return key || null;
  } catch (err) {
    console.error("[ebay-mpn] Public key fetch error:", err);
    return null;
  }
}

function formatPublicKey(key: string): string {
  let formatted = key.replace(/-----BEGIN PUBLIC KEY-----/, "-----BEGIN PUBLIC KEY-----\n");
  formatted = formatted.replace(/-----END PUBLIC KEY-----/, "\n-----END PUBLIC KEY-----");
  return formatted;
}

async function verifySignature(
  payload: EbayNotificationPayload,
  signatureHeader: string
): Promise<boolean> {
  const sig = decodeSignatureHeader(signatureHeader);
  if (!sig) {
    console.warn("[ebay-mpn] Failed to decode x-ebay-signature header");
    return false;
  }

  const publicKeyPem = await getPublicKey(sig.kid);
  if (!publicKeyPem) {
    console.warn("[ebay-mpn] Could not retrieve public key for kid:", sig.kid);
    return false;
  }

  try {
    const verifier = crypto.createVerify("ssl3-sha1");
    verifier.update(JSON.stringify(payload));
    return verifier.verify(formatPublicKey(publicKeyPem), sig.signature, "base64");
  } catch (err) {
    console.error("[ebay-mpn] Signature verification error:", err);
    return false;
  }
}

// Duplicate detection: track processed notification IDs in-memory
const processedNotifications = new Set<string>();
const MAX_PROCESSED_CACHE = 1000;

export async function POST(request: NextRequest) {
  let body: EbayNotificationPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notificationId = body?.notification?.notificationId;
  const topic = body?.metadata?.topic;

  if (topic !== "MARKETPLACE_ACCOUNT_DELETION") {
    console.warn("[ebay-mpn] Unexpected topic:", topic);
    return new NextResponse(null, { status: 204 });
  }

  // Duplicate guard
  if (notificationId && processedNotifications.has(notificationId)) {
    console.log("[ebay-mpn] Duplicate notification, already processed:", notificationId);
    return new NextResponse(null, { status: 204 });
  }

  // Verify eBay signature if credentials are available
  const signatureHeader = request.headers.get("x-ebay-signature");
  const hasCredentials = Boolean(getEbayClientId() && getEbayClientSecret());

  if (signatureHeader && hasCredentials) {
    const valid = await verifySignature(body, signatureHeader);
    if (!valid) {
      console.warn("[ebay-mpn] Invalid signature for notification:", notificationId);
      return NextResponse.json({ error: "Invalid signature" }, { status: 412 });
    }
  } else if (!hasCredentials) {
    console.warn(
      "[ebay-mpn] WARNING: eBay credentials not configured — skipping signature verification. " +
        "Configure EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to enable verification."
    );
  }

  const { notification } = body;
  const { data } = notification;

  console.log(
    `[ebay-mpn] Received account deletion notification: id=${notificationId}, ` +
      `userId=${data.userId}, username=${data.username}`
  );

  // Log for audit/compliance
  try {
    await logActivity({
      entityType: "Security",
      entityId: notificationId || "unknown",
      entityIdentifier: `eBay User: ${data.username || "unknown"}`,
      actionType: "DELETE",
      source: "SYSTEM",
      userName: "eBay MPN Webhook",
      userId: "SYSTEM",
      description:
        `eBay Marketplace Account Deletion notification received. ` +
        `eBay userId=${data.userId}, username=${data.username}. ` +
        `No matching ERP user data found to delete (ERP does not store eBay userId).`,
      metadata: {
        notificationId,
        eventDate: notification.eventDate,
        publishDate: notification.publishDate,
        ebayUserId: data.userId,
        ebayUsername: data.username,
      },
    });
  } catch (err) {
    console.error("[ebay-mpn] Failed to log activity:", err);
  }

  // Anonymize buyer PII in MarketplaceOrder records for EBAY platform.
  // The notification provides eBay userId/username but the ERP only stores
  // buyerEmail/buyerName from order sync. Since we cannot map eBay userId
  // to specific orders, we anonymize all EBAY orders' buyer PII to comply.
  try {
    const anonymized = await prisma.marketplaceOrder.updateMany({
      where: { marketplace: "EBAY" },
      data: {
        buyerName: "[REDACTED]",
        buyerEmail: "[REDACTED]",
        buyerCountry: null,
        buyerCity: null,
        buyerState: null,
        buyerZip: null,
        rawMetadata: null,
      },
    });

    if (anonymized.count > 0) {
      console.log(`[ebay-mpn] Anonymized buyer PII in ${anonymized.count} eBay order(s)`);
    }
  } catch (err) {
    console.error("[ebay-mpn] Failed to anonymize order data:", err);
  }

  // Mark as processed
  if (notificationId) {
    processedNotifications.add(notificationId);
    if (processedNotifications.size > MAX_PROCESSED_CACHE) {
      const first = processedNotifications.values().next().value;
      if (first) processedNotifications.delete(first);
    }
  }

  // Acknowledge receipt — eBay expects 200/201/202/204
  return new NextResponse(null, { status: 204 });
}

export const dynamic = "force-dynamic";
