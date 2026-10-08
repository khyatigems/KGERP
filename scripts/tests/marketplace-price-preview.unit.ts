import assert from "node:assert/strict";
import { calculateDiscountedInr, isBelowMinimumPrice } from "@/lib/marketplace/price-preview";

const convertedSalePrice = calculateDiscountedInr(12, 90, 25);
assert.equal(convertedSalePrice, 810);
assert.equal(isBelowMinimumPrice(convertedSalePrice, 1000), true);
assert.equal(isBelowMinimumPrice(calculateDiscountedInr(15, 90, 0), 1000), false);
assert.equal(calculateDiscountedInr(12, 0, 25), null);
assert.equal(calculateDiscountedInr(12, 90, 100), null);
assert.equal(isBelowMinimumPrice(null, 1000), null);

console.log("Marketplace price preview unit tests passed.");
