import { prisma } from "@/lib/prisma";

export interface ReadinessResult {
  score: number;
  ready: boolean;
  missing: string[];
  checks: Array<{ field: string; passed: boolean; weight: number }>;
}

const CHECKS: Array<{ field: string; weight: number; check: (inv: any) => boolean }> = [
  { field: "title", weight: 10, check: (inv) => Boolean(inv.itemName) },
  { field: "sku", weight: 10, check: (inv) => Boolean(inv.sku) },
  { field: "price", weight: 15, check: (inv) => Number(inv.sellingPrice) > 0 },
  { field: "images", weight: 20, check: (inv) => (inv.media?.length ?? 0) > 0 || Boolean(inv.imageUrl) },
  { field: "category", weight: 10, check: (inv) => Boolean(inv.category) || Boolean(inv.categoryCode) },
  { field: "gemstone_type", weight: 10, check: (inv) => Boolean(inv.gemType) || Boolean(inv.gemstoneCode) },
  { field: "description", weight: 10, check: (inv) => Boolean(inv.description) || Boolean(inv.productDescription) },
  { field: "weight", weight: 10, check: (inv) => Number(inv.carats) > 0 || Number(inv.weightValue) > 0 },
  { field: "certificate", weight: 5, check: (inv) => Boolean(inv.certificateNumber || inv.certificateNo) },
];

/**
 * Compute a future marketplace-listing readiness score for an ERP product.
 * Identifies missing required fields without ever auto-publishing.
 */
export async function assessListingReadiness(inventoryId: string): Promise<ReadinessResult> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      sku: true,
      itemName: true,
      category: true,
      gemType: true,
      description: true,
      productDescription: true,
      sellingPrice: true,
      carats: true,
      weightValue: true,
      imageUrl: true,
      certificateNumber: true,
      certificateNo: true,
      categoryCodeId: true,
      gemstoneCodeId: true,
      media: { select: { id: true } },
    },
  });

  if (!inventory) {
    return { score: 0, ready: false, missing: ["product not found"], checks: [] };
  }

  const checks = CHECKS.map((check) => ({
    field: check.field,
    passed: check.check(inventory),
    weight: check.weight,
  }));

  const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const score = totalWeight > 0 ? Math.round((earned / totalWeight) * 100) : 0;
  const missing = checks.filter((c) => !c.passed).map((c) => c.field);

  return { score, ready: score === 100, missing, checks };
}
