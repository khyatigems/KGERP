import { z } from "zod";
import catalog from "./marketplace/catalog/inventory-fields.json";

export const productFactsSchema = z.object({
 attributes: z.record(z.string().max(100), z.string().max(800)).default({}),
 ebayCategoryId: z.string().max(100).default(""), etsyCategoryId: z.string().max(100).default(""),
 lengthMm: z.string().regex(/^$|^\d+(\.\d+)?$/).default(""), widthMm: z.string().regex(/^$|^\d+(\.\d+)?$/).default(""), breadthMm: z.string().regex(/^$|^\d+(\.\d+)?$/).default(""),
 whoMade: z.enum(["", "I_DID", "SHOP_MEMBER", "ANOTHER_COMPANY_OR_PERSON"]).default(""),
 whatIsIt: z.enum(["", "FINISHED_PRODUCT", "SUPPLY_OR_TOOL"]).default(""), whenMade: z.string().max(40).default(""),
 productionMethod: z.enum(["", "MADE_FROM_SCRATCH", "ASSEMBLED", "ALTERED", "CURATED_SET", "NATURAL_MATERIAL"]).default(""),
 toolsUsed: z.array(z.enum(["HAND_TOOLS", "COMPUTERIZED_TOOLS", "AI_GENERATOR", "NO_TOOLS"])).max(4).default([]),
 tags: z.string().max(500).default(""),
 condition: z.enum(["", "New", "New other", "New with defects", "Very good", "Good", "Acceptable"]).default(""),
});
export type ProductFacts = z.infer<typeof productFactsSchema>;
export const productFactsKey = (id: string) => `inventory_product_facts_v1_${id}`;
export function parseDimensions(value?: string | null) {
 const match = value?.trim().match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)(?:\s*[x×]\s*(\d+(?:\.\d+)?))?\s*(?:mm)?$/i);
 return match ? { lengthMm: match[1], widthMm: match[2], breadthMm: match[3] || "" } : null;
}
export function serializeDimensions(facts: Pick<ProductFacts, "lengthMm" | "widthMm" | "breadthMm">) {
 return [facts.lengthMm, facts.widthMm, facts.breadthMm].filter(Boolean).join(" x ");
}
export const normalizeFact = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const aliases: Record<string, string> = {
 "gemstone type": "gemstone", "gem type": "gemstone", "main stone": "gemstone",
 "gemstone color": "primary color", color: "primary color", "main stone color": "primary color", "gem color": "primary color",
 "gemstone shape": "shape", "main stone shape": "shape", "bead shape": "shape",
 "gemstone treatment": "treatment", "main stone treatment": "treatment",
 "country of origin": "origin country", "weight carats": "carat weight", "weight in carats": "carat weight",
 "gemstone clarity grade": "clarity grade", "gemstone creation": "stone source",
 "item length": "length", "item width": "width", "item depth": "breadth", "closure": "clasp type",
 "number of pieces": "pieces", "bead hole size": "hole size", "bead diameter": "bead size",
};
export const factKey = (name: string) => aliases[normalizeFact(name)] || normalizeFact(name);
// These facts already have a single input in the existing inventory form.
export const existingFactKeys = new Set(["gemstone", "primary color", "shape", "treatment", "origin", "carat weight", "transparency", "length", "width", "breadth", "certification", "bead size", "hole size", "bracelet length"]);
export function categoryFactFields(ebayCategoryId: string, etsyCategoryId: string) {
 const fields = new Map<string, { key: string; label: string; required: boolean; values: string[]; custom: boolean }>();
 const add = (name: string, required: boolean, values: string[], custom: boolean) => {
  const key = factKey(name);
  if (normalizeFact(name) === "lab created" || existingFactKeys.has(key) || /custom property|certific.*(number|id)|laboratory/i.test(name)) return;
  const old = fields.get(key);
  const normalizedValues = key === "stone source" ? values.map((v) => /^lab[- ]created$/i.test(v) ? "Lab grown" : v) : values;
  fields.set(key, { key, label: old?.label || name, required: required || !!old?.required, values: [...new Set([...(old?.values || []), ...normalizedValues])], custom: custom || !!old?.custom });
 };
 const ebay = catalog.ebay.find((entry) => entry.categoryId === ebayCategoryId);
 if (ebay) {
  ebay.requiredAspects.forEach((f) => add(f.name, true, f.values, f.mode !== "SELECTION_ONLY"));
  ebay.optionalAspects.forEach((f) => add(f.name, false, f.values, f.mode !== "SELECTION_ONLY"));
 }
 const etsy = catalog.etsy.find((entry) => entry.category.taxonomyId === etsyCategoryId);
 etsy?.properties.forEach((f) => add(f.name, f.required, f.values.map((v) => v.name), !f.values.length));
 return [...fields.values()];
}
export const productFieldCatalog = catalog;
export function sharedAttributeSuggestion(name: string, facts: ProductFacts | null, dimensions?: string | null, marketplace: "EBAY" | "ETSY" = "EBAY") {
 const key = factKey(name);
 const parsed = parseDimensions(dimensions);
 const size = key === "length" ? parsed?.lengthMm || facts?.lengthMm : key === "width" ? parsed?.widthMm || facts?.widthMm : key === "breadth" ? parsed?.breadthMm || facts?.breadthMm : null;
 if (size) return `${size} mm`;
 let value = facts?.attributes[key]?.trim() || null;
 if (key === "stone source" && value) {
  if (/^(lab created|lab-created|lab grown)$/i.test(value)) value = marketplace === "ETSY" ? "Lab grown" : "Lab-Created";
  if (normalizeFact(name) === "lab created") value = value === "Lab grown" ? "Yes" : value === "Natural" ? "No" : value;
 }
 if (normalizeFact(name) === "lab created") {
  const source = facts?.attributes["stone source"];
  return source && /lab/i.test(source) ? "Yes" : source === "Natural" ? "No" : value;
 }
 return value;
}
