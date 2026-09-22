import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  encryptSecret,
  decryptSecret,
  isSecretEncryptionConfigured,
} from "@/lib/security/secret-store";

const ZOHO_TOKENS_KEY = "email_zoho_oauth_tokens";

export interface ZohoOAuthTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
  accountId?: string | null;
}

export async function saveZohoOAuthTokens(tokens: ZohoOAuthTokens): Promise<void> {
  if (!isSecretEncryptionConfigured()) {
    throw new Error("Secret encryption key is not configured; refusing to store Zoho tokens.");
  }
  const tokenRef = encryptSecret(JSON.stringify(tokens));
  await prisma.setting.upsert({
    where: { key: ZOHO_TOKENS_KEY },
    create: { key: ZOHO_TOKENS_KEY, value: tokenRef },
    update: { value: tokenRef },
  });
}

export async function loadZohoOAuthTokens(): Promise<ZohoOAuthTokens | null> {
  const row = await prisma.setting.findUnique({ where: { key: ZOHO_TOKENS_KEY } });
  if (!row?.value) return null;
  const raw = decryptSecret(row.value);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ZohoOAuthTokens;
  } catch {
    return null;
  }
}

export async function clearZohoOAuthTokens(): Promise<void> {
  await prisma.setting.delete({ where: { key: ZOHO_TOKENS_KEY } }).catch(() => {});
}

export function generateOAuthState(): string {
  return `zoho_${crypto.randomUUID()}`;
}
