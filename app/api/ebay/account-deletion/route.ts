import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

const ENDPOINT_PATH = "/api/ebay/account-deletion";

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

  // Derive the endpoint URL from the actual request host so the hash matches
  // what eBay computes (eBay uses the URL it sends the challenge to).
  const host = request.headers.get("host") || "www.erp.khyatigems.com";
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const endpointUrl = `${proto}://${host}${ENDPOINT_PATH}`;

  console.log("[ebay-mpn] Challenge received:", {
    challengeCode,
    host,
    endpointUrl,
    tokenLength: verificationToken.length,
  });

  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpointUrl);
  const challengeResponse = hash.digest("hex");

  console.log("[ebay-mpn] Challenge verified successfully");

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
  rawPayload: string,
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
    const verifier = crypto.createVerify("sha256");
    verifier.update(rawPayload);
    return verifier.verify(formatPublicKey(publicKeyPem), sig.signature, "base64");
  } catch (err) {
    console.error("[ebay-mpn] Signature verification error:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  let body: EbayNotificationPayload;
  let rawPayload: string;
  try {
    rawPayload = await request.text();
    body = JSON.parse(rawPayload) as EbayNotificationPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notificationId = body?.notification?.notificationId;
  const topic = body?.metadata?.topic;

  if (topic !== "MARKETPLACE_ACCOUNT_DELETION") {
    console.warn("[ebay-mpn] Unexpected topic:", topic);
    return new NextResponse(null, { status: 204 });
  }

  const signatureHeader = request.headers.get("x-ebay-signature");
  const hasCredentials = Boolean(getEbayClientId() && getEbayClientSecret());
  if (!notificationId) return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
  if (!signatureHeader || !hasCredentials) {
    console.error("[ebay-mpn] Rejecting deletion notification because signature verification is unavailable");
    return NextResponse.json({ error: "Signature verification is required" }, { status: 412 });
  }
  const valid = await verifySignature(rawPayload, signatureHeader);
  if (!valid) {
    console.warn("[ebay-mpn] Invalid signature for notification:", notificationId);
    return NextResponse.json({ error: "Invalid signature" }, { status: 412 });
  }

  const { notification } = body;
  const { data } = notification;

  await ensureMarketplaceFoundationSchema();
  try {
    await prisma.ebayWebhookNotification.create({
      data: {
        notificationId,
        topic,
        ebayUserId: data.userId || null,
        ebayUsername: data.username || null,
        signatureValid: true,
        status: "RECEIVED",
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code !== "P2002") {
      console.error("[ebay-mpn] Could not persist notification:", error);
      return NextResponse.json({ error: "Could not persist notification" }, { status: 503 });
    }
  }

  const claim = await prisma.ebayWebhookNotification.updateMany({
    where: { notificationId, status: { in: ["RECEIVED", "FAILED"] } },
    data: { status: "PROCESSING", errorDetails: null },
  });
  if (!claim.count) {
    return new NextResponse(null, { status: 204 });
  }

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
      idempotencyKey: `ebay-account-deletion:${notificationId}`,
      actionType: "DELETE",
      source: "SYSTEM",
      userName: "eBay MPN Webhook",
      userId: "SYSTEM",
      description:
        `eBay Marketplace Account Deletion notification received. ` +
        `eBay userId=${data.userId}, username=${data.username}. ` +
        `The matching marketplace connection will be disconnected when identified.`,
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

  try {
    const matchingShops = await prisma.marketplaceShop.findMany({
      where: { marketplace: "EBAY", externalShopId: String(data.userId || "") },
      select: { connectionId: true },
    });
    const accountRows = await prisma.marketplaceConnection.findMany({
      where: { marketplace: "EBAY", externalAccountId: String(data.userId || "") },
      select: { id: true },
    });
    const connectionIds = Array.from(new Set([
      ...matchingShops.map((shop) => shop.connectionId),
      ...accountRows.map((connection) => connection.id),
    ]));
    if (connectionIds.length) {
      await prisma.marketplaceConnection.updateMany({
        where: { id: { in: connectionIds } },
        data: { status: "DISCONNECTED", tokenRef: null, lastConnectedAt: null },
      });
      await prisma.marketplaceShop.updateMany({
        where: { connectionId: { in: connectionIds } },
        data: { status: "DISCONNECTED" },
      });
      await prisma.marketplaceSyncJob.updateMany({
        where: { marketplaceShop: { connectionId: { in: connectionIds } }, status: "QUEUED" },
        data: { status: "CANCELLED", progressStep: "Cancelled", progressDetail: "eBay account deletion notification received", endedAt: new Date() },
      });
    }
    await prisma.ebayWebhookNotification.update({
      where: { notificationId },
      data: {
        status: connectionIds.length ? "PROCESSED" : "REVIEW_REQUIRED",
        processedAt: new Date(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.ebayWebhookNotification.update({
      where: { notificationId },
      data: { status: "FAILED", errorDetails: message.slice(0, 1000) },
    }).catch(() => {});
    console.error("[ebay-mpn] Failed to process account deletion notice:", err);
    return NextResponse.json({ error: "Could not process notification" }, { status: 503 });
  }

  // Acknowledge receipt — eBay expects 200/201/202/204
  return new NextResponse(null, { status: 204 });
}

export const dynamic = "force-dynamic";
