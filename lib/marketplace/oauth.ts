import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret, isSecretEncryptionConfigured } from "@/lib/security/secret-store";
import type { MarketplacePlatform } from "@/lib/marketplace/types";

export interface StoredOAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
}

export async function isEncryptionReady(): Promise<boolean> {
  return isSecretEncryptionConfigured();
}

export async function saveTokens(
  platform: MarketplacePlatform,
  tokens: StoredOAuthTokens
): Promise<void> {
  if (!isSecretEncryptionConfigured()) {
    throw new Error("Secret encryption key is not configured; refusing to store OAuth tokens.");
  }
  const payload = JSON.stringify(tokens);
  const tokenRef = encryptSecret(payload);

  await prisma.marketplaceConnection.upsert({
    where: { marketplace: platform },
    create: {
      marketplace: platform,
      name: platform,
      authType: "OAUTH2",
      tokenRef,
      status: "CONNECTED",
      scopes: tokens.scope || null,
      lastConnectedAt: new Date(),
    },
    update: {
      tokenRef,
      status: "CONNECTED",
      scopes: tokens.scope || null,
      lastConnectedAt: new Date(),
    },
  });
}

export async function loadTokens(
  platform: MarketplacePlatform
): Promise<StoredOAuthTokens | null> {
  const conn = await prisma.marketplaceConnection.findUnique({ where: { marketplace: platform } });
  if (!conn?.tokenRef) return null;
  const raw = decryptSecret(conn.tokenRef);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredOAuthTokens;
  } catch {
    return null;
  }
}

export async function getConnectionStatus(platform: MarketplacePlatform): Promise<string | null> {
  const conn = await prisma.marketplaceConnection.findUnique({ where: { marketplace: platform } });
  return conn?.status ?? null;
}

export async function setConnectionStatus(
  platform: MarketplacePlatform,
  status: string
): Promise<void> {
  await prisma.marketplaceConnection.upsert({
    where: { marketplace: platform },
    create: { marketplace: platform, name: platform, authType: "OAUTH2", status },
    update: { status },
  });
}

export async function disconnect(platform: MarketplacePlatform): Promise<void> {
  await prisma.marketplaceConnection.updateMany({
    where: { marketplace: platform },
    data: { status: "DISCONNECTED", tokenRef: null, lastConnectedAt: null },
  });
}
