type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const pending = new Map<string, Promise<unknown>>();

function gc() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}

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
  const inFlight = pending.get(key);
  if (inFlight) return inFlight as Promise<T>;
  gc();
  const task = Promise.resolve().then(fn).then(data => {
    // Invalidating an in-flight read must not repopulate stale data.
    if (pending.get(key) === task) {
      if (store.size >= 500) store.delete(store.keys().next().value!);
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
    }
    return data;
  }).finally(() => {
    if (pending.get(key) === task) pending.delete(key);
  });
  pending.set(key, task);
  return task;
}

export function invalidateCache(prefix?: string) {
  if (!prefix) {
    store.clear();
    pending.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
  for (const key of pending.keys()) {
    if (key.startsWith(prefix)) pending.delete(key);
  }
}
