type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();

function gc() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

setInterval(gc, 60_000);

export async function withCache<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = store.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.data as T;
  }
  const data = await fn();
  store.set(key, { data, expiresAt: now + ttlMs });
  return data;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
