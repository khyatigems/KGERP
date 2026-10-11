"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { categoryFactFields, productFieldCatalog, productFactsSchema, type ProductFacts } from "@/lib/inventory-product-facts";
import { ETSY_WHEN_MADE_OPTIONS } from "@/lib/marketplace/etsy-draft-validation";
export function InventoryProductDetails({ inventoryId, value, onChange }: { inventoryId?: string; value?: ProductFacts; onChange: (value: ProductFacts) => void }) {
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(!!inventoryId);
 useEffect(() => {
  if (!inventoryId) return;
  const controller = new AbortController();
  void fetch(`/api/marketplace/inventory-fields?inventoryId=${encodeURIComponent(inventoryId)}`, { signal: controller.signal }).then(async (response) => {
   const data = await response.json(); if (!response.ok) throw new Error(data.error);
   if (!controller.signal.aborted) { onChange(data.productFacts || productFactsSchema.parse({})); setLoading(false); }
  }).catch((reason) => { if (!controller.signal.aborted) { setError(reason instanceof Error ? reason.message : "Unable to load product details."); } });
  return () => controller.abort();
 }, [inventoryId, onChange]);
 const facts = value || productFactsSchema.parse({});
 const change = (update: Partial<ProductFacts>) => onChange({ ...facts, ...update });
 const selectClass = "mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm";
 return <section className="rounded-lg border bg-card/50 p-5 space-y-4"><h3 className="font-semibold">Product details</h3>
  <p className="text-xs text-muted-foreground">Enter each fact once. These details are reused across all shops; gemstone, color, shape, weight and measurements use the fields already in this form.</p>
  {error && <p role="alert" className="text-destructive text-sm">{error} Existing details will be preserved.</p>}
  <fieldset disabled={loading} className="space-y-4">
   <div className="grid gap-3 sm:grid-cols-2">
    <label className="text-sm">Item condition<select className={selectClass} value={facts.condition} onChange={(e) => change({ condition: e.target.value as ProductFacts["condition"] })}><option value="">Choose actual condition</option>{["New", "New other", "New with defects", "Very good", "Good", "Acceptable"].map((v) => <option key={v} value={v}>{v}</option>)}</select></label>
    <label className="text-sm">Sales category · eBay<select className={selectClass} value={facts.ebayCategoryId} onChange={(event) => change({ ebayCategoryId: event.target.value })}><option value="">Choose category</option>{productFieldCatalog.ebay.map((category) => <option key={category.categoryId} value={category.categoryId || ""}>{category.categoryPath} ({category.categoryId})</option>)}</select></label>
    <label className="text-sm">Sales category · Etsy<select className={selectClass} value={facts.etsyCategoryId} onChange={(event) => change({ etsyCategoryId: event.target.value })}><option value="">Choose category</option>{productFieldCatalog.etsy.map(({ category }) => <option key={category.taxonomyId} value={category.taxonomyId}>{category.path}</option>)}</select></label>
   </div>
   {[true, false].map((primary) => {
    const important = new Set(["stone source", "gemstone form", "origin country", "brand", "clarity grade", "pieces", "secondary color"]);
    const group = categoryFactFields(facts.ebayCategoryId, facts.etsyCategoryId).filter((field) => (field.required || important.has(field.key)) === primary).sort((a, b) => Number(b.required) - Number(a.required));
    const inputs = <div className="grid gap-3 sm:grid-cols-2">{group.map((field) => <label key={field.key} className="text-sm">{field.label}{field.required ? " *" : ""}{field.custom ? <><Input list={`facts-${field.key.replaceAll(" ", "-")}`} value={facts.attributes[field.key] || ""} maxLength={800} placeholder="Enter or choose actual value" onChange={(event) => change({ attributes: { ...facts.attributes, [field.key]: event.target.value } })}/><datalist id={`facts-${field.key.replaceAll(" ", "-")}`}>{field.values.map((v) => <option key={v} value={v}/>)}</datalist></> : <select className={selectClass} value={facts.attributes[field.key] || ""} onChange={(event) => change({ attributes: { ...facts.attributes, [field.key]: event.target.value } })}><option value="">Not specified</option>{facts.attributes[field.key] && !field.values.includes(facts.attributes[field.key]) && <option value={facts.attributes[field.key]}>{facts.attributes[field.key]} (saved)</option>}{field.values.map((v) => <option key={v} value={v}>{v}</option>)}</select>}</label>)}</div>;
    return primary ? <div key="primary">{inputs}</div> : <details key="optional"><summary className="cursor-pointer text-sm font-medium">More product attributes ({group.length})</summary><div className="pt-3">{inputs}</div></details>;
   })}
   <details><summary className="cursor-pointer text-sm font-medium">Maker, production and search details</summary><div className="grid gap-3 sm:grid-cols-2 pt-3">
    <label className="text-sm">Who made it?<select className={selectClass} value={facts.whoMade} onChange={(e) => change({ whoMade: e.target.value as ProductFacts["whoMade"] })}><option value="">Choose actual maker</option><option value="I_DID">I did</option><option value="SHOP_MEMBER">A shop member</option><option value="ANOTHER_COMPANY_OR_PERSON">Another company or person</option></select></label>
    <label className="text-sm">Item use<select className={selectClass} value={facts.whatIsIt} onChange={(e) => change({ whatIsIt: e.target.value as ProductFacts["whatIsIt"] })}><option value="">Choose actual use</option><option value="SUPPLY_OR_TOOL">Supply or tool</option><option value="FINISHED_PRODUCT">Finished product</option></select></label>
    <label className="text-sm">When was it made?<select className={selectClass} value={facts.whenMade} onChange={(e) => change({ whenMade: e.target.value })}><option value="">Choose date range</option>{ETSY_WHEN_MADE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label className="text-sm">Production method<select className={selectClass} value={facts.productionMethod} onChange={(e) => change({ productionMethod: e.target.value as ProductFacts["productionMethod"] })}><option value="">Choose actual method</option>{["MADE_FROM_SCRATCH", "ASSEMBLED", "ALTERED", "CURATED_SET", "NATURAL_MATERIAL"].map((v) => <option key={v} value={v}>{v.replaceAll("_", " ").toLowerCase()}</option>)}</select></label>
    <label className="text-sm">Search tags (comma separated)<Input value={facts.tags} onChange={(e) => change({ tags: e.target.value })}/></label>
    <fieldset className="text-sm space-y-1"><legend>Tools used</legend>{(["HAND_TOOLS", "COMPUTERIZED_TOOLS", "AI_GENERATOR", "NO_TOOLS"] as const).map((tool) => <label key={tool} className="flex gap-2"><input type="checkbox" checked={facts.toolsUsed.includes(tool)} onChange={(e) => change({ toolsUsed: e.target.checked ? tool === "NO_TOOLS" ? [tool] : [...facts.toolsUsed.filter((v) => v !== "NO_TOOLS"), tool] : facts.toolsUsed.filter((v) => v !== tool) })}/>{tool.replaceAll("_", " ").toLowerCase()}</label>)}</fieldset>
   </div></details>
  </fieldset>
 </section>;
}
