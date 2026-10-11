import assert from "node:assert/strict";
import { etsySkuRepairProducts } from "../../lib/marketplace/etsy-sku";
const inventory = { products: [{ sku: "", property_values: [], offerings: [{ price: { amount: 8500, divisor: 100 }, quantity: 1, is_enabled: true, readiness_state_id: 456 }] }] };
assert.deepEqual(etsySkuRepairProducts(inventory, "ACTUAL-SKU"), [{ sku: "ACTUAL-SKU", property_values: [], offerings: [{ price: 85, quantity: 1, is_enabled: true, readiness_state_id: 456 }] }]);
assert.throws(() => etsySkuRepairProducts({ products: [...inventory.products, ...inventory.products] }, "SKU"), /variations/);
assert.throws(() => etsySkuRepairProducts({ products: [{ ...inventory.products[0], property_values: [{ property_id: 1 }] }] }, "SKU"), /variations/);
assert.throws(() => etsySkuRepairProducts({ products: [{ offerings: [{ price: 0, quantity: 1, is_enabled: true }] }] }, "SKU"), /invalid/);
console.log("Etsy SKU preservation regression tests passed.");
