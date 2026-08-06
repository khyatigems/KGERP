import assert from "node:assert";
import {
  analyzePricing,
  computeMarketplaceCosts,
  computeMrp,
  computeMsp,
  statusFor,
} from "../../lib/pricing/engine";
import { toInr, fromInr } from "../../lib/pricing/currency";
import type { FeeCharge } from "../../lib/pricing/types";

const ch = (overrides: Partial<FeeCharge>): FeeCharge => ({
  id: "c",
  chargeKey: "OTHER_CHARGE",
  name: "charge",
  enabled: true,
  amountType: "FLAT",
  amount: 0,
  countryCode: null,
  sortOrder: 0,
  ...overrides,
});

// Marketplace costs: flat + percent mix
{
  const costs = computeMarketplaceCosts(100, [
    ch({ chargeKey: "LISTING_FEE", amountType: "FLAT", amount: 10 }),
    ch({ chargeKey: "PLATFORM_FEE", amountType: "PERCENT", amount: 15 }),
    ch({ chargeKey: "TRANSACTION_FEE", amountType: "PERCENT", amount: 3 }),
    ch({ enabled: false, amountType: "FLAT", amount: 999 }),
  ]);
  assert.ok(Math.abs(costs - (10 + 15 + 3)) < 0.001, `costs=${costs}`);
}

// Spec example: Purchase 60, costs 40 -> MSP 100; margin 50% -> MRP 150
{
  const costs = computeMarketplaceCosts(60, [
    ch({ amountType: "FLAT", amount: 40 }),
  ]);
  const msp = computeMsp(60, costs);
  const mrp = computeMrp(msp, "PERCENT", 50);
  assert.ok(Math.abs(msp - 100) < 0.001, `msp=${msp}`);
  assert.ok(Math.abs(mrp - 150) < 0.001, `mrp=${mrp}`);
}

// Flat margin type
{
  const mrp = computeMrp(100, "FLAT", 25);
  assert.ok(Math.abs(mrp - 125) < 0.001);
}

// Status bands: statusFor(mrp, msp)
{
  assert.equal(statusFor(90, 100), "BELOW_MSP");
  assert.equal(statusFor(100, 100), "BREAK_EVEN");
  assert.equal(statusFor(120, 100), "HEALTHY_MARGIN");
  assert.equal(statusFor(150, 100), "PREMIUM_MARGIN");
  assert.equal(statusFor(160, 100), "PREMIUM_MARGIN");
}

// analyzePricing end-to-end
{
  const a = analyzePricing({
    purchasePrice: 60,
    sellingPrice: 150,
    charges: [ch({ amountType: "FLAT", amount: 40 })],
    marginType: "PERCENT",
    marginValue: 50,
  });
  assert.ok(Math.abs(a.marketplaceCosts - 40) < 0.001);
  assert.ok(Math.abs(a.msp - 100) < 0.001);
  assert.ok(Math.abs(a.mrp - 150) < 0.001);
  assert.ok(Math.abs(a.expectedProfit - 50) < 0.001);
  assert.ok(Math.abs(a.diffVsMsp - 50) < 0.001);
  assert.ok(Math.abs(a.diffVsMrp - 0) < 0.001);
  assert.equal(a.status, "PREMIUM_MARGIN");
}

// analyzePricing below MSP
{
  const a = analyzePricing({
    purchasePrice: 60,
    sellingPrice: 90,
    charges: [ch({ amountType: "FLAT", amount: 40 })],
    marginType: "PERCENT",
    marginValue: 50,
  });
  assert.equal(a.status, "BELOW_MSP");
  assert.ok(Math.abs(a.expectedProfit - -10) < 0.001);
}

// Currency conversion
{
  const rates = { INR: 1, USD: 86, EUR: 93 };
  assert.ok(Math.abs(toInr(100, "USD", rates) - 8600) < 0.001);
  assert.ok(Math.abs(toInr(100, "INR", rates) - 100) < 0.001);
  assert.ok(Math.abs(toInr(100, null, rates) - 100) < 0.001);
  assert.ok(Number.isNaN(toInr(100, "AED", rates)), "missing rate should be NaN");
  assert.ok(Math.abs(fromInr(8600, "USD", rates) - 100) < 0.001);
  assert.ok(Math.abs(fromInr(8600, "INR", rates) - 8600) < 0.001);
  assert.ok(Number.isNaN(fromInr(100, "JPY", rates)));
}

console.log("pricing-engine.unit: all assertions passed");
