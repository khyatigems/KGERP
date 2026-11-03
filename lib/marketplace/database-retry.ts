export function isMarketplaceDatabaseBusy(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /SQLITE_BUSY|SQLITE_LOCKED|database (?:table )?is locked/i.test(message);
}

/** Retry only writes known to have been rejected, never ambiguous network failures. */
export async function retryMarketplaceWrite<T>(write: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await write();
    } catch (error) {
      if (attempt >= 4 || !isMarketplaceDatabaseBusy(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 150 * 2 ** attempt + Math.floor(Math.random() * 100)));
    }
  }
}
