import assert from "node:assert/strict";
import { inventoryListingDefaults, nonEmptyEbayAspects } from "../../lib/marketplace/inventory-listing-defaults";

assert.deepEqual(nonEmptyEbayAspects({ "California Prop 65 Warning": ["", "  "], Color: [" Blue ", ""], Shape: [] }), { Color: ["Blue"] });
const saved = inventoryListingDefaults({ itemName: "Natural Zircon", weightValue: 2.5, weightUnit: "cts", etsyDescription: "Saved Etsy description", imageUrl: "https://example.test/inventory.jpg" }, "ETSY");
assert.equal(saved.title, "Natural Zircon - 2.5 cts");
assert.equal(saved.description, "Saved Etsy description");
assert.equal(saved.imageUrl, "https://example.test/inventory.jpg");
assert.equal(inventoryListingDefaults({ itemName: "Gem", etsyDescription: null, imageUrl: null }, "ETSY").description, "");
assert.equal(inventoryListingDefaults({ itemName: "a".repeat(200) }, "ETSY").title.length, 140);
console.log("Inventory listing defaults tests passed.");
