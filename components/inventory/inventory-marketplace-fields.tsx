"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ETSY_WHEN_MADE_OPTIONS } from "@/lib/marketplace/etsy-draft-validation";
import type { InventoryMarketplaceFields } from "@/lib/marketplace/inventory-fields";
type Shop = { id: string; name: string; marketplace: "EBAY" | "ETSY" };
type Options = { categories?: Array<{ taxonomyId: string; path: string }>; sections?: Array<{ id: string; title: string }>; categoryId?: string; categoryPath?: string; suggestions?: Array<{ categoryId: string; categoryPath: string }>; properties?: Array<{ name: string; required: boolean; values: Array<{ name: string }> }>; requiredAspects?: Array<{ name: string; values: string[]; mode: string }>; optionalAspects?: Array<{ name: string; values: string[]; mode: string }> };
export function InventoryMarketplaceFieldsSection({ inventoryId, value, onChange }: { inventoryId?: string; value?: InventoryMarketplaceFields; onChange: (value: InventoryMarketplaceFields) => void }) {
 const [shops, setShops] = useState<Shop[]>([]), [shopId, setShopId] = useState("");
 const [options, setOptions] = useState<Options | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState("");
 const [search, setSearch] = useState("");
 useEffect(() => {
  const controller = new AbortController();
  void fetch(`/api/marketplace/inventory-fields${inventoryId ? `?inventoryId=${encodeURIComponent(inventoryId)}` : ""}`, { signal: controller.signal }).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); if (!controller.signal.aborted) { setShops(data.shops); if (inventoryId) onChange(data.fields); } }).catch((reason) => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Unable to load marketplace fields."); });
  return () => controller.abort();
  // onChange is the stable parent setter; loading depends on the inventory item only.
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [inventoryId]);
 const shop = shops.find((candidate) => candidate.id === shopId);
 const entry = value?.find((candidate) => candidate.shopId === shopId);
 function change(update: Partial<InventoryMarketplaceFields[number]>) {
  if (!shop) return;
  const current = entry || { shopId, marketplace: shop.marketplace, productType: "LOOSE_GEMSTONE" as const, categoryId: "", categoryName: "", attributes: {} };
  onChange([...(value || []).filter((candidate) => candidate.shopId !== shopId), { ...current, ...update }]);
 }
 async function load(categoryId?: string) {
  if (!shop) return;
  setLoading(true); setError(""); setOptions(null);
  try {
   const query = new URLSearchParams({ shopId, productType: entry?.productType || "LOOSE_GEMSTONE" });
   if (categoryId) query.set("categoryId", categoryId);
   const response = await fetch(`/api/marketplace/inventory-fields?${query}`); const data = await response.json(); if (!response.ok) throw new Error(data.error || "Marketplace lookup failed.");
   setOptions(data);
   if (shop.marketplace === "EBAY" && data.categoryId) change({ categoryId: data.categoryId, categoryName: data.categoryPath });
  } catch (reason) { setError(reason instanceof Error ? reason.message : "Marketplace lookup failed."); }
  finally { setLoading(false); }
 }
 const fields = shop?.marketplace === "ETSY" ? options?.properties?.map((field) => ({ ...field, values: field.values.map((option) => option.name), custom: !field.values.length })) : [...(options?.requiredAspects || []).map((field) => ({ ...field, required: true, custom: field.mode !== "SELECTION_ONLY" })), ...(options?.optionalAspects || []).map((field) => ({ ...field, required: false, custom: field.mode !== "SELECTION_ONLY" }))];
 const selectClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
 return <section className="space-y-4 rounded-lg border bg-card p-5">
  <div><h2 className="font-semibold">eBay and Etsy listing fields</h2><p className="mt-1 text-sm text-muted-foreground">Save item-specific fields for each shop. Category choices and attributes are fetched from the marketplace. Missing fields can still be completed during listing; prices are reviewed separately.</p></div>
  <label className="block text-sm">Marketplace shop<select className={selectClass} disabled={loading} value={shopId} onChange={(event) => { setShopId(event.target.value); setOptions(null); setSearch(""); }}><option value="">Choose a shop</option>{shops.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.marketplace} · {candidate.name}{value?.some((saved) => saved.shopId === candidate.id) ? " · Fields entered" : ""}</option>)}</select></label>
  {shop && <>
   <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm">Product type<select className={selectClass} disabled={loading} value={entry?.productType || "LOOSE_GEMSTONE"} onChange={(event) => { change({ productType: event.target.value as InventoryMarketplaceFields[number]["productType"], categoryId: "", categoryName: "", attributes: {} }); setOptions(null); }}><option value="LOOSE_GEMSTONE">Loose gemstone</option><option value={shop.marketplace === "EBAY" ? "JEWELRY" : "BRACELET"}>Bracelet / jewelry</option></select></label><div className="self-end"><Button type="button" variant="outline" disabled={loading} onClick={() => void load(entry?.categoryId || undefined)}>{loading ? "Loading marketplace…" : "Load current category fields"}</Button></div></div>
   {entry?.categoryName && <p className="text-sm">Saved category: {entry.categoryName}</p>}
   {shop.marketplace === "ETSY" && options?.categories && <><Input aria-label="Search Etsy inventory categories" placeholder="Search Etsy categories" value={search} onChange={(event) => setSearch(event.target.value)} /><label className="block text-sm">Etsy category<select className={selectClass} disabled={loading} value={entry?.categoryId || ""} onChange={(event) => { const category = options.categories?.find((candidate) => candidate.taxonomyId === event.target.value); if (!category) return; change({ categoryId: category.taxonomyId, categoryName: category.path, attributes: {} }); void load(category.taxonomyId); }}><option value="">Choose the actual category</option>{options.categories.filter((category) => category.path.toLowerCase().includes(search.toLowerCase()) || category.taxonomyId === entry?.categoryId).slice(0, 250).map((category) => <option key={category.taxonomyId} value={category.taxonomyId}>{category.path}</option>)}</select></label></>}
   {shop.marketplace === "EBAY" && !options?.categoryId && options?.suggestions && <select aria-label="eBay inventory category" className={selectClass} onChange={(event) => void load(event.target.value)} defaultValue=""><option value="">Select matching eBay category</option>{options.suggestions.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryPath}</option>)}</select>}
   <div className="grid gap-3 sm:grid-cols-2">{fields?.map((field) => <label key={field.name} className="block text-sm">{field.name}{field.required ? " *" : " (optional)"}{field.values.length > 0 && <select disabled={loading} className={selectClass} value={entry?.attributes[field.name] || ""} onChange={(event) => change({ attributes: { ...entry?.attributes, [field.name]: event.target.value } })}><option value="">Not specified</option>{field.values.map((option) => <option key={option} value={option}>{option}</option>)}</select>}{field.custom && <Input disabled={loading} aria-label={`${field.name} custom value`} value={entry?.attributes[field.name] || ""} onChange={(event) => change({ attributes: { ...entry?.attributes, [field.name]: event.target.value } })} placeholder="Enter actual value" />}</label>)}</div>
   {shop.marketplace === "ETSY" && <div className="grid gap-3 sm:grid-cols-2">
    <label className="block text-sm">Who made it?<select className={selectClass} value={entry?.whoMade || ""} onChange={(event) => change({ whoMade: event.target.value as InventoryMarketplaceFields[number]["whoMade"] })}><option value="">Choose actual maker</option><option value="I_DID">I did</option><option value="SHOP_MEMBER">A shop member</option><option value="ANOTHER_COMPANY_OR_PERSON">Another company or person</option></select></label>
    <label className="block text-sm">What is it?<select className={selectClass} value={entry?.whatIsIt || ""} onChange={(event) => change({ whatIsIt: event.target.value as InventoryMarketplaceFields[number]["whatIsIt"] })}><option value="">Choose actual item use</option><option value="SUPPLY_OR_TOOL">Supply or tool for making products</option><option value="FINISHED_PRODUCT">Finished product</option></select></label>
    <label className="block text-sm">When was it made?<select className={selectClass} value={entry?.whenMade || ""} onChange={(event) => change({ whenMade: event.target.value })}><option value="">Choose actual date range</option>{ETSY_WHEN_MADE_OPTIONS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
    <label className="block text-sm">How does your shop produce it?<select className={selectClass} value={entry?.productionMethod || ""} onChange={(event) => change({ productionMethod: event.target.value as InventoryMarketplaceFields[number]["productionMethod"] })}><option value="">Choose actual method</option><option value="MADE_FROM_SCRATCH">Made from scratch</option><option value="ASSEMBLED">Assembled</option><option value="ALTERED">Altered</option><option value="CURATED_SET">Curated set</option><option value="NATURAL_MATERIAL">Natural material</option></select></label>
    <fieldset className="space-y-1 text-sm"><legend>Tools used (optional)</legend>{(["HAND_TOOLS", "COMPUTERIZED_TOOLS", "AI_GENERATOR", "NO_TOOLS"] as const).map((tool) => <label key={tool} className="flex gap-2"><input type="checkbox" checked={entry?.toolsUsed?.includes(tool) || false} onChange={(event) => change({ toolsUsed: event.target.checked ? tool === "NO_TOOLS" ? [tool] : [...(entry?.toolsUsed || []).filter((value) => value !== "NO_TOOLS"), tool] : (entry?.toolsUsed || []).filter((value) => value !== tool) })} />{tool.replaceAll("_", " ").toLowerCase()}</label>)}</fieldset>
    <label className="block text-sm">Listing quantity<Input type="number" min="1" max="999" value={entry?.quantity || ""} onChange={(event) => change({ quantity: event.target.value })} /></label>
    <label className="block text-sm">Tags (comma separated)<Input value={entry?.tags || ""} onChange={(event) => change({ tags: event.target.value })} /></label>
    <label className="block text-sm">Shop section<select className={selectClass} value={entry?.shopSectionId || ""} onChange={(event) => change({ shopSectionId: event.target.value })}><option value="">No shop section</option>{options?.sections?.map((section) => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
   </div>}
   <p className="text-xs text-muted-foreground">These values are saved with this inventory item when you save the form. Other inventory items and global marketplace defaults are unchanged.</p>
  </>}
  {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
 </section>;
}
