import assert from "node:assert/strict";
import { valuationDelta } from "@/lib/sales-return-valuation";

function run() {
  const v1 = valuationDelta({ sellingPrice: 1000, costPrice: 6000 });
  assert.equal(v1.delta, -5000);
  assert.equal(v1.sellingPrice, 1000);
  assert.equal(v1.costPrice, 6000);

  const v2 = valuationDelta({ sellingPrice: 1, costPrice: 6000 });
  assert.equal(v2.delta, -5999);

  const v3 = valuationDelta({ sellingPrice: 6000, costPrice: 6000 });
  assert.equal(v3.delta, 0);

  console.log("sales-return-valuation.unit.ts passed");
}

run();

