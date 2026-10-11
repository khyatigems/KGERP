export const EBAY_BATCH_LIMIT = 25;
export type EbayBatchDraft = { id: string; shopId: string | null; sku: string };

export function validateEbayBatchSelection(drafts: EbayBatchDraft[]) {
  if (!drafts.length || drafts.length > EBAY_BATCH_LIMIT) throw new Error(`Select between 1 and ${EBAY_BATCH_LIMIT} eBay drafts.`);
  if (drafts.some((draft) => !draft.shopId || !draft.sku || draft.sku === "—")) throw new Error("Every selected draft must have a shop and SKU.");
  if (new Set(drafts.map((draft) => draft.id)).size !== drafts.length || new Set(drafts.map((draft) => `${draft.shopId}:${draft.sku}`)).size !== drafts.length) throw new Error("Select only one draft per SKU in each shop.");
}

// Each operation is individually authorized/validated by the listing endpoint.
// A failure is surfaced for that item and is never silently retried.
export async function runEbayBatch<T>(drafts: EbayBatchDraft[], operation: (draft: EbayBatchDraft) => Promise<T>, stopped: () => boolean, progress: (draft: EbayBatchDraft, result: { value?: T; error?: string }) => void) {
  validateEbayBatchSelection(drafts);
  for (const draft of drafts) {
    if (stopped()) break;
    try { progress(draft, { value: await operation(draft) }); }
    catch (error) { progress(draft, { error: error instanceof Error ? error.message : "eBay operation failed." }); }
  }
}
