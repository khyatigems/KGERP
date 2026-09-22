import { prisma } from "@/lib/prisma";

export const FEATURE_FLAG_KEYS = {
  marketplaceApiSync: "marketplaceApiSyncEnabled",
  ebaySync: "ebaySyncEnabled",
  etsySync: "etsySyncEnabled",
  fulfillmentModel: "newFulfillmentModelEnabled",
  emailEngine: "newEmailEngineEnabled",
  gciCertificate: "gciCertificateIntegrationEnabled",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[keyof typeof FEATURE_FLAG_KEYS];

function toBool(value: string | undefined | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on";
}

export async function getFeatureFlag(key: FeatureFlagKey): Promise<boolean> {
  try {
    const row = await prisma.setting.findUnique({ where: { key } });
    return toBool(row?.value);
  } catch {
    return false;
  }
}

export async function getFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const keys = Object.values(FEATURE_FLAG_KEYS) as FeatureFlagKey[];
  try {
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const map = new Map(rows.map((r) => [r.key, toBool(r.value)]));
    const result = {} as Record<FeatureFlagKey, boolean>;
    for (const key of keys) {
      result[key] = map.get(key) ?? false;
    }
    return result;
  } catch {
    const result = {} as Record<FeatureFlagKey, boolean>;
    for (const key of keys) result[key] = false;
    return result;
  }
}

export async function isMarketplaceSyncEnabled(): Promise<boolean> {
  const [master, ebay, etsy] = await Promise.all([
    getFeatureFlag(FEATURE_FLAG_KEYS.marketplaceApiSync),
    getFeatureFlag(FEATURE_FLAG_KEYS.ebaySync),
    getFeatureFlag(FEATURE_FLAG_KEYS.etsySync),
  ]);
  return master && (ebay || etsy);
}
