import assert from "node:assert/strict";
import { computeInvoiceGst } from "@/lib/invoice-gst";

function run() {
  const gstRates = { General: "3", "Yellow Sapphire": "3" };
  const items = [
    { salePrice: 6000, netAmount: 6000, discountAmount: 0, inventory: { category: "General", itemName: "Yellow Sapphire" } },
    { salePrice: 1, netAmount: 1, discountAmount: 0, inventory: { category: "General", itemName: "Yellow Sapphire" } },
  ];
  const res = computeInvoiceGst({ items, gstRates, displayOptions: {} });
  const expectedTaxable = items.reduce((s, i) => s + Number(i.netAmount), 0) / 1.03;
  const expectedGst = items.reduce((s, i) => s + Number(i.netAmount), 0) - expectedTaxable;
  assert.ok(Math.abs(res.taxableTotal - expectedTaxable) < 0.01);
  assert.ok(Math.abs(res.gstTotal - expectedGst) < 0.01);
  console.log("gst-v22.unit.ts passed");
}

run();

