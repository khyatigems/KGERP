import { prisma } from "@/lib/prisma";

export type FulfillmentReason = "EXACT" | "SUBSTITUTE" | "SPLIT" | "MANUAL";

export interface SubstituteCandidate {
  inventoryId: string;
  sku: string;
  itemName: string;
  gemType: string | null;
  category: string | null;
  color: string | null;
  shape: string | null;
  carats: number;
  weightValue: number;
  sellingPrice: number;
  score: number;
}

export interface FulfillmentCost {
  cost: number;
  source: "FLAT" | "PER_CARAT" | "UNKNOWN";
}

/**
 * Resolve the physical COGS for a fulfillment SKU using the same precedence
 * as the existing sale flow (flatPurchaseCost -> purchaseRatePerCarat * weight).
 */
export async function resolveFulfillmentCost(sku: string): Promise<FulfillmentCost | null> {
  const inventory = await prisma.inventory.findUnique({
    where: { sku },
    select: {
      flatPurchaseCost: true,
      purchaseRatePerCarat: true,
      weightValue: true,
    },
  });
  if (!inventory) return null;

  if (inventory.flatPurchaseCost != null && inventory.flatPurchaseCost > 0) {
    return { cost: inventory.flatPurchaseCost, source: "FLAT" };
  }
  const perCarat = Number(inventory.purchaseRatePerCarat || 0);
  const weight = Number(inventory.weightValue || 0);
  if (perCarat > 0 && weight > 0) {
    return { cost: perCarat * weight, source: "PER_CARAT" };
  }
  return { cost: 0, source: "UNKNOWN" };
}

/**
 * Suggest substitute inventory when a listed SKU is unavailable. Candidates
 * are scored by configurable similarity criteria (gemType, category, color,
 * shape, carat proximity, weight proximity, price proximity, availability).
 * This is read-only — the user makes the final selection.
 */
export async function suggestSubstituteSku(
  listedSku: string,
  limit = 10
): Promise<SubstituteCandidate[]> {
  const source = await prisma.inventory.findUnique({
    where: { sku: listedSku },
    select: {
      id: true,
      gemType: true,
      category: true,
      color: true,
      shape: true,
      carats: true,
      weightValue: true,
      sellingPrice: true,
      costPrice: true,
    },
  });
  if (!source) return [];

  const candidates = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK",
      id: { not: source.id },
    },
    select: {
      id: true,
      sku: true,
      itemName: true,
      gemType: true,
      category: true,
      color: true,
      shape: true,
      carats: true,
      weightValue: true,
      sellingPrice: true,
      costPrice: true,
    },
  });

  const sourceCarats = Number(source.carats || 0);
  const sourceWeight = Number(source.weightValue || 0);
  const sourcePrice = Number(source.sellingPrice || 0);

  const scored: SubstituteCandidate[] = candidates.map((c) => {
    let score = 0;
    if (c.gemType && source.gemType && c.gemType.toLowerCase() === source.gemType.toLowerCase()) score += 40;
    if (c.category && source.category && c.category.toLowerCase() === source.category.toLowerCase()) score += 15;
    if (c.color && source.color && c.color.toLowerCase() === source.color.toLowerCase()) score += 15;
    if (c.shape && source.shape && c.shape.toLowerCase() === source.shape.toLowerCase()) score += 10;

    const caratDiff = Math.abs(Number(c.carats || 0) - sourceCarats);
    if (sourceCarats > 0) score += Math.max(0, 10 - caratDiff / Math.max(sourceCarats * 0.2, 0.01));

    const weightDiff = Math.abs(Number(c.weightValue || 0) - sourceWeight);
    if (sourceWeight > 0) score += Math.max(0, 5 - weightDiff / Math.max(sourceWeight * 0.2, 0.01));

    const priceDiff = Math.abs(Number(c.sellingPrice || 0) - sourcePrice);
    if (sourcePrice > 0) score += Math.max(0, 5 - priceDiff / Math.max(sourcePrice * 0.5, 1));

    return {
      inventoryId: c.id,
      sku: c.sku,
      itemName: c.itemName,
      gemType: c.gemType,
      category: c.category,
      color: c.color,
      shape: c.shape,
      carats: Number(c.carats || 0),
      weightValue: Number(c.weightValue || 0),
      sellingPrice: Number(c.sellingPrice || 0),
      score: Math.round(score),
    };
  });

  return scored
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface AssignFulfillmentResult {
  success: boolean;
  message?: string;
}

/**
 * Record the fulfillment relationship on a marketplace order item:
 *   listed SKU (commercial attribution) vs fulfillment SKU (physical COGS).
 * The original SKU's inventory history is never modified.
 */
export async function assignFulfillment(params: {
  orderItemId: string;
  fulfillmentSku: string;
  reason: FulfillmentReason;
}): Promise<AssignFulfillmentResult> {
  const { orderItemId, fulfillmentSku, reason } = params;

  const item = await prisma.marketplaceOrderItem.findUnique({ where: { id: orderItemId } });
  if (!item) return { success: false, message: "Order item not found" };

  const fulfillmentInventory = await prisma.inventory.findUnique({ where: { sku: fulfillmentSku } });
  if (!fulfillmentInventory) {
    return { success: false, message: `Fulfillment SKU ${fulfillmentSku} not found in ERP` };
  }
  if (fulfillmentInventory.status !== "IN_STOCK") {
    return { success: false, message: `Fulfillment SKU ${fulfillmentSku} is not in stock` };
  }

  await prisma.marketplaceOrderItem.update({
    where: { id: orderItemId },
    data: {
      fulfillmentSku,
      fulfillmentReason: reason,
      inventoryId: fulfillmentInventory.id,
      status: "FULFILLED",
    },
  });

  return { success: true };
}
