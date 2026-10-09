export type EtsyRequirementsScope = { shopId: string; taxonomyId: string };
export type EtsyRequirementsCategory = { taxonomyId: string; name: string; path: string };

export function areEtsyRequirementsCurrent(
  loaded: EtsyRequirementsScope | null,
  shopId: string,
  taxonomyId: string
): boolean {
  return Boolean(taxonomyId && loaded?.shopId === shopId && loaded.taxonomyId === taxonomyId);
}

// Loading the category list and loading its properties form one operation.
// The first click must not stop after merely selecting a category.
export async function loadEtsyCategoryRequirements<T extends { categories: EtsyRequirementsCategory[] }>(
  input: { shopId: string; taxonomyId: string; inventoryId: string },
  chooseCategory: (categories: EtsyRequirementsCategory[]) => EtsyRequirementsCategory | null,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<{ options: T; taxonomyId: string; categoryName: string }> {
  const request = async (taxonomyId?: string): Promise<T> => {
    const response = await fetcher("/api/marketplace/listing-preparation", {
      method: "POST", headers: { "Content-Type": "application/json" }, signal,
      body: JSON.stringify({ action: "etsyRequirements", shopId: input.shopId, inventoryId: input.inventoryId || undefined, etsyTaxonomyId: taxonomyId || undefined }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Unable to load Etsy category requirements.");
    return payload as T;
  };
  let taxonomyId = input.taxonomyId;
  if (!taxonomyId) {
    const list = await request();
    const category = chooseCategory(list.categories);
    if (!category) throw new Error("Etsy did not return a matching product category.");
    taxonomyId = category.taxonomyId;
  }
  const options = await request(taxonomyId);
  const category = options.categories.find((candidate) => candidate.taxonomyId === taxonomyId);
  if (!category) throw new Error("The selected Etsy category is no longer available. Reload categories.");
  return { options, taxonomyId, categoryName: category.path };
}
