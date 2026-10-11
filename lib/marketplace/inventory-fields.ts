import { etsyPlainText } from "./etsy-plain-text";
import { z } from "zod";
export const inventoryMarketplaceFieldsSchema = z.array(z.object({
 shopId: z.string().min(1).max(100), marketplace: z.enum(["EBAY", "ETSY"]),
 productType: z.enum(["LOOSE_GEMSTONE", "JEWELRY", "BRACELET"]),
 categoryId: z.string().max(100), categoryName: z.string().max(500),
 attributes: z.record(z.string().max(100), z.string().max(500)),
 whoMade: z.enum(["", "I_DID", "SHOP_MEMBER", "ANOTHER_COMPANY_OR_PERSON"]).optional(),
 whatIsIt: z.enum(["", "FINISHED_PRODUCT", "SUPPLY_OR_TOOL"]).optional(),
 whenMade: z.string().max(40).optional(), tags: z.string().max(500).optional(),
 quantity: z.string().regex(/^$|^[1-9]\d{0,2}$/).optional(), shopSectionId: z.string().max(100).optional(),
 productionMethod: z.enum(["", "MADE_FROM_SCRATCH", "ASSEMBLED", "ALTERED", "CURATED_SET", "NATURAL_MATERIAL"]).optional(),
 toolsUsed: z.array(z.enum(["HAND_TOOLS", "COMPUTERIZED_TOOLS", "AI_GENERATOR", "NO_TOOLS"])).max(4).optional(),
})).max(10).refine((entries) => new Set(entries.map((entry) => entry.shopId)).size === entries.length, "Save only one field set per shop.");
export type InventoryMarketplaceFields = z.infer<typeof inventoryMarketplaceFieldsSchema>;
export const inventoryMarketplaceFieldsKey = (id: string) => `inventory_marketplace_fields_v1_${id}`;
export function etsyShopDescription(description: string, shopName: string) {
 if (!/^crystal\s*veda$/i.test(shopName.trim())) return description;
 return etsyPlainText(description).replace(/^(.*?Why Buy From )KhyatiGems([ \t]*)$/gim, "$1CrystalVeda$2");
}
