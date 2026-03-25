import assert from "node:assert/strict";
import { computeReturnStockPlacement } from "@/lib/sales-return-rules";

function run() {
  const withinResale = computeReturnStockPlacement({ daysSinceInvoice: 3, resaleable: true });
  assert.equal(withinResale.status, "IN_STOCK");
  assert.equal(withinResale.stockLocation, "SHOP");

  const withinDamaged = computeReturnStockPlacement({ daysSinceInvoice: 3, resaleable: false });
  assert.equal(withinDamaged.stockLocation, "HOLD");

  const afterWindow = computeReturnStockPlacement({ daysSinceInvoice: 8, resaleable: true });
  assert.equal(afterWindow.stockLocation, "HOLD");

  console.log("sales-return-rules.unit.ts passed");
}

run();

