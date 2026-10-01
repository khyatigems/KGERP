import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret, isSecretEncryptionConfigured } from "@/lib/security/secret-store";
import type { MarketplacePlatform } from "@/lib/marketplace/types";
import type { EtsyOAuthAppProfile } from "@/lib/marketplace/connector";

export interface StoredOAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
}

const refreshInFlight = new Map<string, Promise<string>>();

export async function getValidAccessToken(
  connectionId: string,
  refresh: (tokens: StoredOAuthTokens) => Promise<string>
): Promise<string> {
  const current = await loadTokens(connectionId);
  if (!current?.accessToken) throw new Error("Marketplace account is not connected. Complete OAuth first.");
  if (current.expiresAt && new Date(current.expiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
    return current.accessToken;
  }
  if (!current.refreshToken) throw new Error("Marketplace access token expired and no refresh token is available.");

  const activeRefresh = refreshInFlight.get(connectionId);
  if (activeRefresh) return activeRefresh;

  const promise = (async () => {
    const latest = await loadTokens(connectionId);
    if (!latest?.accessToken) throw new Error("Marketplace account is not connected. Complete OAuth first.");
    if (latest.expiresAt && new Date(latest.expiresAt).getTime() - Date.now() > 5 * 60 * 1000) {
      return latest.accessToken;
    }
    if (!latest.refreshToken) throw new Error("Marketplace access token expired and no refresh token is available.");
    return refresh(latest);
  })();
  refreshInFlight.set(connectionId, promise);
  try {
    return await promise;
  } finally {
    if (refreshInFlight.get(connectionId) === promise) refreshInFlight.delete(connectionId);
  }
}

export async function isEncryptionReady(): Promise<boolean> {
  return isSecretEncryptionConfigured();
}

export async function saveTokens(
  platform: MarketplacePlatform,
  externalAccountId: string,
  accountName: string | null,
  tokens: StoredOAuthTokens,
  options: { oauthAppProfile?: EtsyOAuthAppProfile } = {}
): Promise<string> {
  if (!isSecretEncryptionConfigured()) {
    throw new Error("Secret encryption key is not configured; refusing to store OAuth tokens.");
  }
  const payload = JSON.stringify(tokens);
  const tokenRef = encryptSecret(payload);

  const connection = await prisma.marketplaceConnection.upsert({
    where: { marketplace_externalAccountId: { marketplace: platform, externalAccountId } },
    create: {
      marketplace: platform,
      externalAccountId,
      name: accountName || externalAccountId,
      authType: "OAUTH2",
      oauthAppProfile: platform === "ETSY" ? options.oauthAppProfile || "ETSY_SELLER_LEGACY" : null,
      tokenRef,
      status: "CONNECTED",
      scopes: tokens.scope || null,
      ...(platform === "ETSY" && options.oauthAppProfile ? { oauthAppProfile: options.oauthAppProfile } : {}),
      lastConnectedAt: new Date(),
    },
    update: {
      name: accountName || externalAccountId,
      tokenRef,
      status: "CONNECTED",
      scopes: tokens.scope || null,
      lastConnectedAt: new Date(),
    },
  });
  return connection.id;
}

export async function loadTokens(
  connectionId: string
): Promise<StoredOAuthTokens | null> {
  const conn = await prisma.marketplaceConnection.findUnique({ where: { id: connectionId } });
  if (!conn?.tokenRef) return null;
  const raw = decryptSecret(conn.tokenRef);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOAuthTokens;
  } catch {
    return null;
  }
}

export async function updateTokens(
  connectionId: string,
  tokens: StoredOAuthTokens
): Promise<void> {
  if (!isSecretEncryptionConfigured()) {
    throw new Error("Secret encryption key is not configured; refusing to store OAuth tokens.");
  }
  await prisma.marketplaceConnection.update({
    where: { id: connectionId },
    data: {
      tokenRef: encryptSecret(JSON.stringify(tokens)),
      scopes: tokens.scope || null,
      status: "CONNECTED",
    },
  });
}

export async function getConnectionStatus(connectionId: string): Promise<string | null> {
  const conn = await prisma.marketplaceConnection.findUnique({ where: { id: connectionId } });
  return conn?.status ?? null;
}

export async function setConnectionStatus(
  connectionId: string,
  status: string
): Promise<void> {
  await prisma.marketplaceConnection.update({
    where: { id: connectionId },
    data: { status },
  });
}

export async function disconnect(connectionId: string): Promise<void> {
  await prisma.marketplaceConnection.updateMany({
    where: { id: connectionId },
    data: { status: "DISCONNECTED", tokenRef: null, lastConnectedAt: null },
  });
  await prisma.marketplaceShop.updateMany({
    where: { connectionId },
    data: { status: "DISCONNECTED" },
  });
  await prisma.marketplaceSyncJob.updateMany({
    where: { marketplaceShop: { connectionId }, status: "QUEUED" },
    data: {
      status: "CANCELLED",
      progressStep: "Cancelled",
      progressDetail: "Marketplace account disconnected",
      endedAt: new Date(),
    },
  });
}
