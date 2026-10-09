export type InventoryListingSource = {
  itemName: string;
  weightValue?: number | null;
  weightUnit?: string | null;
  etsyDescription?: string | null;
  imageUrl?: string | null;
};

export function inventoryListingDefaults(item: InventoryListingSource, marketplace: "EBAY" | "ETSY") {
  const weight = item.weightValue ? `${item.weightValue} ${item.weightUnit || "cts"}` : "";
  return {
    title: [item.itemName, weight].filter(Boolean).join(" - ").slice(0, marketplace === "EBAY" ? 80 : 140),
    description: item.etsyDescription?.trim() || "",
    imageUrl: item.imageUrl?.trim() || "",
  };
}

export function nonEmptyEbayAspects(aspects: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(Object.entries(aspects).flatMap(([name, values]) => {
    const usable = values.map((value) => value.trim()).filter(Boolean);
    return usable.length ? [[name, usable]] : [];
  }));
}
