import { prisma } from "./prisma";

export interface PriceSuggestionParams {
  categoryCodeId?: string;
  gemstoneCodeId?: string;
  vendorId?: string;
  weightValue: number;
  weightUnit: string;
  pricingMode: "PER_CARAT" | "PER_RATTI" | "FLAT";
}

export interface PriceSuggestionResult {
  suggestedSellingRate: number | null;
  suggestedSellingPrice: number | null;
  suggestedPurchaseRate: number | null;
  confidence: number;
  sampleCount: number;
  minRate: number | null;
  maxRate: number | null;
  matchLevel: "exact" | "close" | "broad" | "none";
}

interface InventoryRow {
  pricingMode: string | null;
  sellingRatePerCarat: number | null;
  purchaseRatePerCarat: number | null;
  flatSellingPrice: number | null;
  flatPurchaseCost: number | null;
  carats: number | null;
  sellingPrice: number | null;
}

const RATTI_TO_CARAT = 0.917;

function computeCarats(weightValue: number, weightUnit: string): number {
  if (weightUnit === "ratti") return weightValue * RATTI_TO_CARAT;
  return weightValue;
}

function computeWeightRatti(weightValue: number, weightUnit: string): number {
  if (weightUnit === "ratti") return weightValue;
  return weightValue / RATTI_TO_CARAT;
}

function normalizeRates(row: InventoryRow): { selling: number | null; purchase: number | null } {
  const pm = row.pricingMode;
  let selling: number | null = null;
  let purchase: number | null = null;

  if (pm === "PER_RATTI") {
    selling = (row.sellingRatePerCarat ?? 0) / RATTI_TO_CARAT;
    purchase = (row.purchaseRatePerCarat ?? 0) / RATTI_TO_CARAT;
  } else if (pm === "FLAT" || pm === "FIXED") {
    const carats = row.carats ?? 0;
    const flatSelling = row.flatSellingPrice ?? 0;
    const flatPurchase = row.flatPurchaseCost ?? 0;
    selling = carats > 0 ? (flatSelling > 0 ? flatSelling : (row.sellingPrice ?? 0)) / carats : null;
    purchase = carats > 0 ? (flatPurchase > 0 ? flatPurchase : 0) / carats : null;
  } else {
    selling = row.sellingRatePerCarat ?? null;
    purchase = row.purchaseRatePerCarat ?? null;
  }

  return { selling, purchase };
}

function hasValidRate(row: InventoryRow): boolean {
  const pm = row.pricingMode;
  if (pm === "FLAT" || pm === "FIXED") {
    return (row.flatSellingPrice ?? 0) > 0 || (row.sellingPrice ?? 0) > 0;
  }
  return (row.sellingRatePerCarat ?? 0) > 0;
}

async function queryRates(
  where: Record<string, unknown>
): Promise<Array<{ selling: number; purchase: number }>> {
  try {
    const rows = await prisma.inventory.findMany({
      where: {
        status: "IN_STOCK",
        ...where,
      },
      select: {
        pricingMode: true,
        sellingRatePerCarat: true,
        purchaseRatePerCarat: true,
        flatSellingPrice: true,
        flatPurchaseCost: true,
        carats: true,
        sellingPrice: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1000,
    });

    const results: Array<{ selling: number; purchase: number }> = [];
    for (const row of rows) {
      if (!hasValidRate(row)) continue;
      const { selling, purchase } = normalizeRates(row);
      if (selling !== null && selling > 0 && Number.isFinite(selling)) {
        results.push({ selling, purchase: purchase ?? 0 });
      }
    }
    return results;
  } catch (err) {
    console.error("[price-suggestion] queryRates FAILED:", err);
    return [];
  }
}

function toDisplayRate(normalizedRate: number, pricingMode: string): number {
  if (pricingMode === "PER_RATTI") return normalizedRate * RATTI_TO_CARAT;
  return normalizedRate;
}

function computeTotalPrice(
  displayRate: number,
  pricingMode: string,
  carats: number,
  weightRatti: number
): number {
  if (pricingMode === "PER_CARAT") return displayRate * carats;
  if (pricingMode === "PER_RATTI") return displayRate * weightRatti;
  return displayRate * carats;
}

function calcStats(values: number[]): {
  mean: number;
  min: number;
  max: number;
  count: number;
  stddev: number;
} | null {
  const clean = values.filter((v) => v > 0 && Number.isFinite(v));
  if (clean.length === 0) return null;
  const mean = clean.reduce((s, v) => s + v, 0) / clean.length;
  const variance =
    clean.reduce((s, v) => s + (v - mean) ** 2, 0) / clean.length;
  const stddev = Math.sqrt(variance);
  return {
    mean,
    min: Math.min(...clean),
    max: Math.max(...clean),
    count: clean.length,
    stddev,
  };
}

function processRates(
  rates: Array<{ selling: number; purchase: number }>,
  pricingMode: string,
  carats: number,
  weightRatti: number
): Omit<PriceSuggestionResult, "matchLevel"> | null {
  const sellingRates = rates.map((r) => r.selling);
  if (sellingRates.length === 0) return null;

  const raw = calcStats(sellingRates);
  if (!raw) return null;

  const threshold = raw.stddev > 0.01 ? 3 * raw.stddev : Infinity;
  const filtered = sellingRates.filter((v) => Math.abs(v - raw.mean) <= threshold);

  const final = filtered.length >= 2 ? calcStats(filtered) : raw;
  if (!final) return null;

  const displayRate = toDisplayRate(final.mean, pricingMode);
  const displayMin = toDisplayRate(final.min, pricingMode);
  const displayMax = toDisplayRate(final.max, pricingMode);
  const totalPrice = (carats > 0 || weightRatti > 0)
    ? computeTotalPrice(displayRate, pricingMode, carats, weightRatti)
    : null;

  const purchaseRates = rates
    .map((r) => r.purchase)
    .filter((v): v is number => v > 0 && Number.isFinite(v));
  const avgPurchaseRate =
    purchaseRates.length > 0
      ? purchaseRates.reduce((s, v) => s + v, 0) / purchaseRates.length
      : null;

  return {
    suggestedSellingRate: displayRate,
    suggestedSellingPrice: totalPrice,
    suggestedPurchaseRate:
      avgPurchaseRate !== null
        ? toDisplayRate(avgPurchaseRate, pricingMode)
        : null,
    confidence: Math.min(final.count / 20, 0.95),
    sampleCount: final.count,
    minRate: displayMin,
    maxRate: displayMax,
  };
}

export interface SampleDetail {
  sku: string | null;
  itemName: string;
  weightCarats: number;
  sellingRate: number;
  purchaseRate: number;
  pricingMode: string;
}

async function querySamples(
  where: Record<string, unknown>,
  pricingMode: string
): Promise<SampleDetail[]> {
  try {
    const rows = await prisma.inventory.findMany({
      where: {
        status: "IN_STOCK",
        ...where,
      },
      select: {
        sku: true,
        itemName: true,
        carats: true,
        pricingMode: true,
        sellingRatePerCarat: true,
        purchaseRatePerCarat: true,
        flatSellingPrice: true,
        flatPurchaseCost: true,
        sellingPrice: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const results: SampleDetail[] = [];
    for (const row of rows) {
      if (!hasValidRate(row)) continue;
      const { selling, purchase } = normalizeRates(row);
      if (selling !== null && selling > 0 && Number.isFinite(selling)) {
        results.push({
          sku: row.sku,
          itemName: row.itemName,
          weightCarats: row.carats ?? 0,
          sellingRate: toDisplayRate(selling, pricingMode),
          purchaseRate: purchase !== null ? toDisplayRate(purchase, pricingMode) : 0,
          pricingMode: row.pricingMode ?? "PER_CARAT",
        });
      }
    }
    return results;
  } catch (err) {
    console.error("[price-suggestion] querySamples FAILED:", err);
    return [];
  }
}

export async function getPriceSuggestionSamples(
  params: PriceSuggestionParams
): Promise<SampleDetail[]> {
  const { categoryCodeId, gemstoneCodeId, vendorId, pricingMode } = params;

  if (categoryCodeId && gemstoneCodeId && vendorId) {
    const samples = await querySamples({ categoryCodeId, gemstoneCodeId, vendorId }, pricingMode);
    if (samples.length >= 2) return samples;
  }

  if (categoryCodeId && gemstoneCodeId) {
    const samples = await querySamples({ categoryCodeId, gemstoneCodeId }, pricingMode);
    if (samples.length > 0) return samples;
  }

  if (categoryCodeId) {
    const samples = await querySamples({ categoryCodeId }, pricingMode);
    if (samples.length > 0) return samples;
  }

  return [];
}

export async function getPriceSuggestions(
  params: PriceSuggestionParams
): Promise<PriceSuggestionResult> {
  const { categoryCodeId, gemstoneCodeId, vendorId, weightValue, weightUnit, pricingMode } = params;

  if (!categoryCodeId && !gemstoneCodeId) {
    return {
      suggestedSellingRate: null,
      suggestedSellingPrice: null,
      suggestedPurchaseRate: null,
      confidence: 0,
      sampleCount: 0,
      minRate: null,
      maxRate: null,
      matchLevel: "none",
    };
  }

  const carats = computeCarats(weightValue, weightUnit);
  const weightRatti = computeWeightRatti(weightValue, weightUnit);

  if (categoryCodeId && gemstoneCodeId && vendorId) {
    const exact = await queryRates({
      categoryCodeId,
      gemstoneCodeId,
      vendorId,
    });
    const r = processRates(exact, pricingMode, carats, weightRatti);
    if (r && r.sampleCount >= 2) return { ...r, matchLevel: "exact" };
  }

  if (categoryCodeId && gemstoneCodeId) {
    const close = await queryRates({
      categoryCodeId,
      gemstoneCodeId,
    });
    const r = processRates(close, pricingMode, carats, weightRatti);
    if (r) return { ...r, matchLevel: "close" };
  }

  if (categoryCodeId) {
    const broad = await queryRates({
      categoryCodeId,
    });
    const r = processRates(broad, pricingMode, carats, weightRatti);
    if (r) return { ...r, matchLevel: "broad" };
  }

  return {
    suggestedSellingRate: null,
    suggestedSellingPrice: null,
    suggestedPurchaseRate: null,
    confidence: 0,
    sampleCount: 0,
    minRate: null,
    maxRate: null,
    matchLevel: "none",
  };
}
