import assert from "node:assert/strict";
import { etsyShopDescription, inventoryMarketplaceFieldsKey, inventoryMarketplaceFieldsSchema } from "../../lib/marketplace/inventory-fields";
import { inventoryFieldsFromForm, saveInventoryMarketplaceFields } from "../../lib/marketplace/inventory-fields-store";
import type { Prisma } from "@prisma/client";

async function main() {
 const fields = [{ shopId: "etsy-crystal", marketplace: "ETSY" as const, productType: "LOOSE_GEMSTONE" as const, categoryId: "123", categoryName: "Gemstones", attributes: { "Craft type": "Jewelry making" }, quantity: "1" }];
 assert.deepEqual(inventoryMarketplaceFieldsSchema.parse([]), []);
 assert.equal(inventoryMarketplaceFieldsSchema.safeParse([...fields, ...fields]).success, false);
 assert.equal(inventoryMarketplaceFieldsSchema.safeParse([{ ...fields[0], quantity: "0" }]).success, false);
 assert.deepEqual(inventoryFieldsFromForm(new FormData()), { fields: undefined });
 const form = new FormData();
 form.set("marketplaceFields", "bad JSON");
 assert.ok(inventoryFieldsFromForm(form).error);
 form.set("marketplaceFields", JSON.stringify(fields));
 assert.deepEqual(inventoryFieldsFromForm(form).fields, fields);
 const writes: unknown[] = [];
 const tx = { marketplaceShop: { findMany: async () => [{ id: "etsy-crystal", marketplace: "ETSY" }] }, setting: { upsert: async (args: unknown) => { writes.push(args); } } } as unknown as Prisma.TransactionClient;
 await saveInventoryMarketplaceFields(tx, "item-one", fields);
 assert.deepEqual((writes[0] as { where: unknown }).where, { key: inventoryMarketplaceFieldsKey("item-one") });
 assert.notEqual(inventoryMarketplaceFieldsKey("item-one"), inventoryMarketplaceFieldsKey("item-two"));
 await assert.rejects(saveInventoryMarketplaceFields(tx, "item-two", [{ ...fields[0], marketplace: "EBAY" }]), /no longer matches/);
 assert.equal(writes.length, 1);
 const description = "### ⭐ Why Buy From KhyatiGems\n\nActual green zircon. KhyatiGems certification information.";
 assert.match(etsyShopDescription(description, "CrystalVeda"), /⭐ Why Buy From CrystalVeda/);
 assert.match(etsyShopDescription(description, "CrystalVeda"), /KhyatiGems certification information/);
 assert.equal(etsyShopDescription(description, "khyatigemsofficial"), description);
 assert.equal(etsyShopDescription(description, "Other shop"), description);
 assert.match(etsyShopDescription(description, " crystalveda "), /Why Buy From CrystalVeda/);
 console.log("Inventory marketplace field safety and shop branding tests passed.");
}
void main();
