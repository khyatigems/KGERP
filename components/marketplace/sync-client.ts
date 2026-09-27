const STORAGE_KEY = "marketplace-sync-batches";

export function readMarketplaceSyncBatches(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function rememberMarketplaceSyncBatch(batchId: string) {
  const batches = readMarketplaceSyncBatches();
  if (!batches.includes(batchId)) localStorage.setItem(STORAGE_KEY, JSON.stringify([...batches, batchId]));
  window.dispatchEvent(new CustomEvent("marketplace-sync-batch", { detail: { batchId } }));
}

export function forgetMarketplaceSyncBatch(batchId: string) {
  const batches = readMarketplaceSyncBatches().filter((value) => value !== batchId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
}
