export type EtsySkuInventory = { products?: Array<{ sku?: string; property_values?: unknown[]; offerings?: Array<{ price: number | { amount: number; divisor: number }; quantity: number; is_enabled: boolean; readiness_state_id?: number }> }> };
/** A single-item draft only. Do not replace an Etsy seller's later variation edits. */
export function etsySkuRepairProducts(inventory: EtsySkuInventory, sku: string) {
  const product = inventory.products?.[0];
  if (inventory.products?.length !== 1 || !product || product.property_values?.length || product.offerings?.length !== 1) throw new Error("This draft has variations or incomplete inventory. Review its SKU in Etsy.");
  const offering = product.offerings[0];
  const price = typeof offering.price === "number" ? offering.price : offering.price.amount / offering.price.divisor;
  if (!Number.isFinite(price) || price <= 0 || !Number.isInteger(offering.quantity) || offering.quantity < 1) throw new Error("Etsy returned invalid draft price or quantity.");
  return [{ sku, property_values: [], offerings: [{ price, quantity: offering.quantity, is_enabled: offering.is_enabled, ...(offering.readiness_state_id ? { readiness_state_id: offering.readiness_state_id } : {}) }] }];
}
