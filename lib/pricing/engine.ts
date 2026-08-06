import type {
  ChargeKey,
  FeeCharge,
  MarginType,
  PricingAnalysis,
  PricingStatus,
} from "./types";

/** Tolerance used to decide "break even" proximity to MSP. */
export function breakEvenEpsilon(msp: number): number {
  return Math.max(0.01, msp * 0.001);
}

/**
 * Resolve the procurement cost for an item. Flat purchase cost takes precedence,
 * otherwise the per-carat rate is multiplied by weight. This is the single shared
 * cost resolution used across planning and financial modules.
 */
export function resolvePurchaseCost(input: {
  flatPurchaseCost?: number | null;
  purchaseRatePerCarat?: number | null;
  weightValue?: number | null;
}): number {
  const flat = Number(input.flatPurchaseCost);
  if (Number.isFinite(flat) && flat > 0) return flat;
  const rate = Number(input.purchaseRatePerCarat);
  const weight = Number(input.weightValue);
  if (Number.isFinite(rate) && Number.isFinite(weight)) return rate * weight;
  return 0;
}

/**
 * Sum of enabled marketplace charges against a purchase price.
 * FLAT charges add their amount; PERCENT charges add amount% of the purchase price.
 */
export function computeMarketplaceCosts(
  purchasePrice: number,
  charges: FeeCharge[]
): number {
  const base = Number.isFinite(purchasePrice) ? purchasePrice : 0;
  return charges.reduce((sum, c) => {
    if (!c.enabled) return sum;
    const amount = Number(c.amount);
    if (!Number.isFinite(amount) || amount === 0) return sum;
    if (c.amountType === "PERCENT") return sum + (base * amount) / 100;
    return sum + amount;
  }, 0);
}

/** Breakdown of each charge's contribution (for UI cost breakdown). */
export function computeCostBreakdown(
  purchasePrice: number,
  charges: FeeCharge[]
): Partial<Record<ChargeKey, number>> {
  const base = Number.isFinite(purchasePrice) ? purchasePrice : 0;
  const out: Partial<Record<ChargeKey, number>> = {};
  for (const c of charges) {
    if (!c.enabled) continue;
    const amount = Number(c.amount);
    if (!Number.isFinite(amount) || amount === 0) continue;
    const value = c.amountType === "PERCENT" ? (base * amount) / 100 : amount;
    out[c.chargeKey] = (out[c.chargeKey] || 0) + value;
  }
  return out;
}

/** MSP = Purchase Price + total marketplace costs. */
export function computeMsp(purchasePrice: number, marketplaceCosts: number): number {
  return (Number.isFinite(purchasePrice) ? purchasePrice : 0) + marketplaceCosts;
}

/**
 * @deprecated Legacy helper — retained for backward compatibility only.
 * New code should set MRP = sellingPrice directly.
 */
export function computeMrp(
  msp: number,
  marginType: MarginType,
  marginValue: number
): number {
  const mv = Number(marginValue);
  if (!Number.isFinite(mv) || mv === 0) return msp;
  if (marginType === "PERCENT") return msp + (msp * mv) / 100;
  return msp + mv;
}

/**
 * Pricing status based on MRP (selling price) vs MSP (purchase + marketplace fees).
 * BELOW_MSP  — MRP < MSP: listing at MRP won't cover marketplace costs.
 * BREAK_EVEN — MRP ≈ MSP: just covers costs, no profit.
 * HEALTHY_MARGIN — MRP > MSP: profitable listing.
 * PREMIUM_MARGIN — MRP > MSP × 1.5: high-margin item.
 */
export function statusFor(mrp: number, msp: number): PricingStatus {
  const r = Number.isFinite(mrp) ? mrp : 0;
  const m = Number.isFinite(msp) ? msp : 0;
  const eps = breakEvenEpsilon(m);
  if (r < m - eps) return "BELOW_MSP";
  if (Math.abs(r - m) <= eps) return "BREAK_EVEN";
  if (r >= m * 1.5) return "PREMIUM_MARGIN";
  return "HEALTHY_MARGIN";
}

export interface AnalyzePricingInput {
  purchasePrice: number;
  sellingPrice: number;
  charges: FeeCharge[];
  marginType: MarginType;
  marginValue: number;
}

/**
 * Full planning analysis for one inventory item against one fee schedule.
 * MRP = selling price (the base, saved during inventory creation).
 * MSP = purchase price + marketplace fees (minimum listing price on marketplace).
 * Expected Profit = MRP − MSP.
 * MSP/MRP are planning values ONLY — never used by financial modules.
 */
export function analyzePricing(input: AnalyzePricingInput): PricingAnalysis {
  const purchasePrice = Number.isFinite(input.purchasePrice) ? input.purchasePrice : 0;
  const sellingPrice = Number.isFinite(input.sellingPrice) ? input.sellingPrice : 0;
  const marketplaceCosts = computeMarketplaceCosts(purchasePrice, input.charges);
  const msp = computeMsp(purchasePrice, marketplaceCosts);
  const mrp = sellingPrice;
  const diffVsMsp = mrp - msp;
  const expectedProfit = mrp - msp;
  const profitPct = purchasePrice > 0 ? (expectedProfit / purchasePrice) * 100 : 0;
  const marginPct = mrp > 0 ? (expectedProfit / mrp) * 100 : 0;
  return {
    purchasePrice,
    marketplaceCosts,
    costBreakdown: computeCostBreakdown(purchasePrice, input.charges),
    msp,
    mrp,
    sellingPrice,
    diffVsMsp,
    diffVsMrp: 0,
    expectedProfit,
    profitPct,
    marginPct,
    status: statusFor(mrp, msp),
  };
}
