import assert from "node:assert/strict";
import { etsyDraftValidationErrors, ETSY_WHEN_MADE_OPTIONS } from "../../lib/marketplace/etsy-draft-validation";
const valid = { title: "Cubic Zirconia Peridot Green - 13 cts", whenMade: "2020_2026", tags: ["jewelry making"], price: 85 };
assert.deepEqual(etsyDraftValidationErrors(valid), []);
for (const [whenMade] of ETSY_WHEN_MADE_OPTIONS) assert.deepEqual(etsyDraftValidationErrors({ ...valid, whenMade }), []);
for (const whenMade of ["2000_2009", "before_1960", "nonsense"]) assert.match(etsyDraftValidationErrors({ ...valid, whenMade }).join(), /date range/);
assert.match(etsyDraftValidationErrors({ ...valid, title: "💎 Gemstone" }).join(), /unsupported/);
assert.match(etsyDraftValidationErrors({ ...valid, title: "Green & Blue & Red" }).join(), /only once/);
assert.match(etsyDraftValidationErrors({ ...valid, tags: ["green & blue"] }).join(), /tags/);
assert.match(etsyDraftValidationErrors({ ...valid, price: 0.004 }).join(), /0.01/);
console.log("Etsy draft validation tests passed.");

const resale = { ...valid, whoMade: "ANOTHER_COMPANY_OR_PERSON", isSupply: false };
assert.match(etsyDraftValidationErrors(resale).join(), /Supply or tool/);
assert.deepEqual(etsyDraftValidationErrors({ ...resale, isSupply: true }), []);
assert.deepEqual(etsyDraftValidationErrors({ ...resale, whoMade: "I_DID" }), []);
assert.deepEqual(etsyDraftValidationErrors({ ...resale, whenMade: "1990s" }), []);
