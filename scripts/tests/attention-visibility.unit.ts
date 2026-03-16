import { applyAttentionVisibilityFilters } from "@/lib/attention-widget-visibility";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const baseData = {
    quotations: [{ id: "q1" }],
    invoices: [],
    memo: [{ id: "m1", inventory: { sku: "SKU-1" } }],
    vendors: 0,
    unsold: [{ id: "u1", sku: "SKU-1" }, { id: "u2", sku: "SKU-2" }],
    missingCertifications: [{ id: "c1", sku: "SKU-1" }, { id: "c2", sku: "SKU-3" }],
    missingImages: [{ id: "i1", sku: "SKU-1" }, { id: "i2", sku: "SKU-4" }],
    pendingExpenses: [],
    highValueUnsold: [{ id: "h1", sku: "SKU-2" }]
  };

  const globalHidden = applyAttentionVisibilityFilters(baseData, {
    hideMissingCertifications: true,
    hideMissingImages: true
  });
  assert(globalHidden.missingCertifications.length === 0, "Global cert hide should suppress certificate alerts");
  assert(globalHidden.missingImages.length === 0, "Global image hide should suppress image alerts");
  assert(globalHidden.unsold.length === 2, "Global cert/image hide must not suppress unsold alerts");

  const skuHidden = applyAttentionVisibilityFilters(baseData, {
    hideMissingCertifications: false,
    hideMissingImages: false,
    runtimeHiddenSkuIds: new Set(["SKU-1"])
  });
  assert(skuHidden.missingCertifications.length === 1, "SKU-level hide should remove matching certificate alerts");
  assert(skuHidden.missingCertifications[0].sku === "SKU-3", "Only non-hidden SKU cert alerts should remain");
  assert(skuHidden.missingImages.length === 1, "SKU-level hide should remove matching image alerts");
  assert(skuHidden.missingImages[0].sku === "SKU-4", "Only non-hidden SKU image alerts should remain");
  assert(skuHidden.unsold.length === 1 && skuHidden.unsold[0].sku === "SKU-2", "SKU-level hide should remove hidden SKU from unsold alerts");
  assert(skuHidden.memo.length === 0, "SKU-level hide should remove hidden SKU from memo alerts");

  const noItems = applyAttentionVisibilityFilters(
    {
      quotations: [],
      invoices: [],
      memo: [],
      vendors: 0,
      unsold: [],
      missingCertifications: [],
      missingImages: [],
      pendingExpenses: [],
      highValueUnsold: []
    },
    { hideMissingCertifications: false, hideMissingImages: false }
  );
  assert(noItems.hasItems === false, "hasItems should be false when every attention section is empty");
}

run();
console.log("attention-visibility.unit.ts passed");
