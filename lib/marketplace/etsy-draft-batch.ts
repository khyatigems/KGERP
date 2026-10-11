export async function runEtsyDraftBatch<T extends { key: string; saved?: boolean; failed?: boolean }>(items: T[], limit: number, save: (item: T) => Promise<void>, shouldStop: () => boolean, failed: (item: T, error: unknown) => void) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 25) throw new Error("Choose a batch size from 1 to 25.");
  if (new Set(items.map((item) => item.key)).size !== items.length) throw new Error("An inventory item and shop may occur only once in a batch.");
  for (const item of items.filter((entry) => !entry.saved && !entry.failed).slice(0, limit)) {
    if (shouldStop()) break;
    try { await save(item); } catch (error) { failed(item, error); }
  }
}
