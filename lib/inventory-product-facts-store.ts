import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { productFactsKey, productFactsSchema, type ProductFacts } from "./inventory-product-facts";
export async function loadProductFacts(id: string): Promise<ProductFacts | null> {
 const row = await prisma.setting.findUnique({ where: { key: productFactsKey(id) } });
 return row ? productFactsSchema.parse(JSON.parse(row.value)) : null;
}
export function productFactsFromForm(form: FormData) {
 if (!form.has("productFacts")) return { facts: undefined };
 try { return { facts: productFactsSchema.parse(JSON.parse(String(form.get("productFacts")))) }; }
 catch { return { error: "Product details are invalid. Inventory has not been changed." }; }
}
export async function saveProductFacts(tx: Prisma.TransactionClient, id: string, facts: ProductFacts) {
 const value = JSON.stringify(productFactsSchema.parse(facts)), key = productFactsKey(id);
 await tx.setting.upsert({ where: { key }, create: { key, value, description: "Shared inventory product facts for all shops" }, update: { value } });
}
