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

interface RawRateRow {
  normalizedSellingRate: number | null;
  normalizedPurchaseRate: number | null;
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

async function queryRates(
  whereConditions: string,
  params: unknown[]
): Promise<RawRateRow[]> {
  const sql = `
    SELECT
      CASE
        WHEN i.pricingMode = 'PER_RATTI' THEN i.sellingRatePerCarat / ${RATTI_TO_CARAT}
        WHEN i.pricingMode = 'FLAT' THEN i.flatSellingPrice / NULLIF(i.carats, 0)
        ELSE i.sellingRatePerCarat
      END as normalizedSellingRate,
      CASE
        WHEN i.pricingMode = 'PER_RATTI' THEN i.purchaseRatePerCarat / ${RATTI_TO_CARAT}
        WHEN i.pricingMode = 'FLAT' THEN i.flatPurchaseCost / NULLIF(i.carats, 0)
        ELSE i.purchaseRatePerCarat
      END as normalizedPurchaseRate
    FROM inventory i
    WHERE i.status = 'IN_STOCK'
      AND i.carats > 0
      AND (
        i.sellingRatePerCarat > 0
        OR (i.pricingMode = 'FLAT' AND i.flatSellingPrice > 0)
      )
      ${whereConditions}
    ORDER BY i.createdAt DESC
    LIMIT 1000
  `;
  try {
    return (await prisma.$queryRawUnsafe(sql, ...params)) as RawRateRow[];
  } catch {
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
  rows: RawRateRow[],
  pricingMode: string,
  carats: number,
  weightRatti: number
): Omit<PriceSuggestionResult, "matchLevel"> | null {
  const sellingRates = rows
    .map((r) => r.normalizedSellingRate)
    .filter((v): v is number => v !== null && v > 0 && Number.isFinite(v));
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
  const totalPrice = computeTotalPrice(displayRate, pricingMode, carats, weightRatti);

  const purchaseRates = rows
    .map((r) => r.normalizedPurchaseRate)
    .filter((v): v is number => v !== null && v > 0 && Number.isFinite(v));
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

  if (!weightValue || weightValue <= 0) {
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

  if (categoryCodeId && gemstoneCodeId && vendorId) {
    const exact = await queryRates(
      "AND i.categoryCodeId = ? AND i.gemstoneCodeId = ? AND i.vendorId = ?",
      [categoryCodeId, gemstoneCodeId, vendorId]
    );
    const r = processRates(exact, pricingMode, carats, weightRatti);
    if (r && r.sampleCount >= 2) return { ...r, matchLevel: "exact" };
  }

  if (categoryCodeId && gemstoneCodeId) {
    const close = await queryRates(
      "AND i.categoryCodeId = ? AND i.gemstoneCodeId = ?",
      [categoryCodeId, gemstoneCodeId]
    );
    const r = processRates(close, pricingMode, carats, weightRatti);
    if (r && r.sampleCount >= 2) return { ...r, matchLevel: "close" };
  }

  if (categoryCodeId) {
    const broad = await queryRates("AND i.categoryCodeId = ?", [
      categoryCodeId,
    ]);
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
