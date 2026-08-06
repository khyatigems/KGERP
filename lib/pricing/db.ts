import { unstable_cache } from "next/cache";
import { ensurePricingEngineSchema, prisma } from "@/lib/prisma";
import { DEFAULT_MARKETPLACE_SETTING } from "./constants";
import type { CurrencyRates } from "./currency";
import type { FeeCharge, MarketplaceProfileConfig } from "./types";

const PRICING_TTL = 60;

function mapCharge(c: {
  id: string;
  chargeKey: string;
  name: string;
  enabled: boolean;
  amountType: string;
  amount: number;
  countryCode: string | null;
  sortOrder: number;
}): FeeCharge {
  return {
    id: c.id,
    chargeKey: c.chargeKey as FeeCharge["chargeKey"],
    name: c.name,
    enabled: c.enabled,
    amountType: (c.amountType === "FLAT" ? "FLAT" : "PERCENT") as FeeCharge["amountType"],
    amount: Number(c.amount) || 0,
    countryCode: c.countryCode,
    sortOrder: Number(c.sortOrder) || 0,
  };
}

async function loadProfilesUncached(): Promise<MarketplaceProfileConfig[]> {
  await ensurePricingEngineSchema();
  const profiles = await prisma.marketplaceProfile.findMany({
    where: { isActive: true },
    include: {
      charges: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    displayName: p.displayName,
    currency: p.currency || "INR",
    isActive: p.isActive,
    isDefault: p.isDefault,
    marginType: (p.marginType === "FLAT" ? "FLAT" : "PERCENT") as MarketplaceProfileConfig["marginType"],
    marginValue: Number(p.marginValue) || 0,
    charges: (p.charges || []).map(mapCharge),
  }));
}

/** All active marketplace fee schedules (cached, invalidated on settings change). */
export const getProfiles = unstable_cache(
  loadProfilesUncached,
  ["pricing", "profiles"],
  { revalidate: PRICING_TTL, tags: ["pricing:fees"] }
) as unknown as () => Promise<MarketplaceProfileConfig[]>;

export async function getProfileByName(
  name: string
): Promise<MarketplaceProfileConfig | undefined> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.name.toUpperCase() === String(name || "").toUpperCase());
}

/** The profile marked as default; falls back to the first active profile. */
export async function getDefaultProfile(): Promise<MarketplaceProfileConfig | undefined> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.isDefault) ?? profiles[0];
}

async function loadRatesUncached(): Promise<CurrencyRates> {
  await ensurePricingEngineSchema();
  const rows = await prisma.currencyRate.findMany();
  const map: CurrencyRates = {};
  for (const r of rows) map[r.code] = Number(r.rateToInr) || 0;
  return map;
}

/** Currency code -> INR rate map (cached). */
export const getCurrencyRates = unstable_cache(
  loadRatesUncached,
  ["pricing", "rates"],
  { revalidate: PRICING_TTL, tags: ["pricing:rates"] }
) as unknown as () => Promise<CurrencyRates>;

async function loadDefaultMarketplaceUncached(): Promise<string> {
  await ensurePricingEngineSchema();
  try {
    const row = await prisma.setting.findUnique({
      where: { key: DEFAULT_MARKETPLACE_SETTING },
    });
    if (row?.value) return String(row.value).toUpperCase();
  } catch {
    // fall through
  }
  return "ETSY";
}

/** Name of the marketplace whose fee schedule drives single-row MSP/MRP planning. */
export const getDefaultMarketplaceName = unstable_cache(
  loadDefaultMarketplaceUncached,
  ["pricing", "defaultMarketplace"],
  { revalidate: PRICING_TTL, tags: ["pricing:fees"] }
) as unknown as () => Promise<string>;

/** Whether the pricing-analysis view of the Opportunity Report is enabled. */
export async function isPricingEngineEnabled(): Promise<boolean> {
  await ensurePricingEngineSchema();
  try {
    const row = await prisma.setting.findUnique({
      where: { key: "pricing_engine_enabled" },
    });
    return String(row?.value || "").toLowerCase() === "true";
  } catch {
    return false;
  }
}
