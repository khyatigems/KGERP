import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inventoryMarketplaceFieldsKey, inventoryMarketplaceFieldsSchema, type InventoryMarketplaceFields } from "./inventory-fields";
export async function loadInventoryMarketplaceFields(id: string): Promise<InventoryMarketplaceFields> {
 const row = await prisma.setting.findUnique({ where: { key: inventoryMarketplaceFieldsKey(id) } });
 if (!row) return [];
 try { return inventoryMarketplaceFieldsSchema.parse(JSON.parse(row.value)); } catch { throw new Error("Saved marketplace fields could not be read. They have not been changed."); }
}
export async function saveInventoryMarketplaceFields(tx: Prisma.TransactionClient, id: string, fields: InventoryMarketplaceFields) {
 const entries = inventoryMarketplaceFieldsSchema.parse(fields);
 if (entries.length) {
  const shops = await tx.marketplaceShop.findMany({ where: { id: { in: entries.map((entry) => entry.shopId) } }, select: { id: true, marketplace: true } });
  if (entries.some((entry) => !shops.some((shop) => shop.id === entry.shopId && shop.marketplace === entry.marketplace))) throw new Error("A marketplace shop no longer matches the saved fields.");
 }
 const key = inventoryMarketplaceFieldsKey(id);
 await tx.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(entries), description: "Inventory-specific marketplace preparation fields" }, update: { value: JSON.stringify(entries) } });
}
export function inventoryFieldsFromForm(form: FormData) {
 if (!form.has("marketplaceFields")) return { fields: undefined };
 try { return { fields: inventoryMarketplaceFieldsSchema.parse(JSON.parse(String(form.get("marketplaceFields")))) }; }
 catch { return { error: "Marketplace fields are invalid. Review them before saving; inventory has not been changed." }; }
}
