import { erpEventSchema } from "./core";
import type { WorkContext } from "./browser-context";
import type { z } from "zod";

type Interval = z.infer<typeof erpEventSchema>;
export type TrackingState = { active: boolean; paused: boolean; context: WorkContext | null; pending: number; error: string };
const IDLE = 300000, BUFFER = IDLE + 90000, MAX_AGE = 7 * 86400000;
type Options = {
  userId: string; ownerId: string; domain: string; context: WorkContext;
  storage: Pick<Storage, "length" | "key" | "getItem" | "setItem">;
  focused: () => boolean; onChange: (state: TrackingState) => void;
  fetcher?: typeof fetch; now?: () => number; onSynced?: () => void;
};

// One controller per mounted workspace, independent of route and pause changes.
// Every queue belongs to an account and a document. Only abandoned queues are recovered.
export function createAutomaticTracking(options: Options) {
  const { storage } = options, now = options.now || Date.now, fetcher = options.fetcher || fetch;
  const prefix = `kg-work-intervals:${options.userId}:`, key = `${prefix}${options.ownerId}`;
  const leaseKey = (queueKey: string) => queueKey.replace("kg-work-intervals:", "kg-work-owner:");
  const pauseKey = `kg-work-paused:${options.userId}`;
  let queue: unknown[] = [], context = options.context, paused = false, disposed = false, sending = false;
  let previous: { at: number; context: WorkContext } | null = null, lastInteraction = now(), retryAt = 0;
  let storageError = "", syncError = "", retainedWarning = "", readable = false;
  const rejectedUntil = new Map<string, number>();
  const read = (queueKey: string): unknown[] => {
    const records: unknown = JSON.parse(storage.getItem(queueKey) || "[]");
    if (!Array.isArray(records)) throw new Error("Invalid local queue");
    return records;
  };
  try { queue = read(key); paused = storage.getItem(pauseKey) === "true"; readable = true; }
  catch { storageError = "Local tracking storage cannot be read. Existing records are preserved; recording is paused."; }
  const storedQueues = () => {
    const result = new Map<string, unknown[]>();
    for (let i = 0; i < storage.length; i++) {
      const queueKey = storage.key(i);
      if (!queueKey?.startsWith(prefix)) continue;
      try { result.set(queueKey, queueKey === key ? queue : read(queueKey)); }
      catch { retainedWarning = "Some local records cannot be read and have been preserved."; }
    }
    result.set(key, queue); return result;
  };
  const eligible = () => !disposed && !paused && !storageError && options.focused() && now() - lastInteraction < IDLE && queue.length < 10000;
  const update = () => {
    if (disposed) return;
    let pending = queue.length;
    try { pending = [...storedQueues().values()].reduce((count, records) => count + records.length, 0); }
    catch { storageError = "Local storage is unavailable. Recording is paused to protect pending work."; }
    options.onChange({ active: Boolean(previous) && eligible(), paused, context, pending, error: storageError || syncError || retainedWarning || (queue.length >= 10000 ? "Pending queue is full. Recording resumes after synchronization." : "") });
  };
  const persist = () => {
    if (storageError) return;
    try { storage.setItem(key, JSON.stringify(queue)); storage.setItem(leaseKey(key), String(now())); }
    catch { storageError = "Local storage is full or unavailable. Recording is paused to protect pending work. Keep this tab open and restore storage access."; }
  };
  const sample = (allowStart = true) => {
    if (disposed) return;
    const at = now();
    if (previous && at > previous.at && at - previous.at <= 90000) {
      const c = previous.context;
      queue.push({ id: crypto.randomUUID(), platform: c.platform, activityType: c.activityType, domain: options.domain, eventType: "ACTIVE", startedAt: new Date(previous.at).toISOString(), occurredAt: new Date(at).toISOString(), classificationOverride: c.platform !== "ERP", inventoryId: c.inventoryId, marketplaceShopId: c.marketplaceShopId, listingRecordId: c.listingRecordId });
    }
    if (at - lastInteraction >= IDLE) queue = queue.flatMap(record => {
      const parsed = erpEventSchema.safeParse(record);
      if (!parsed.success || !parsed.data.startedAt) return [record];
      const end = Math.min(+new Date(parsed.data.occurredAt), lastInteraction);
      return end > +new Date(parsed.data.startedAt) ? [{ ...parsed.data, occurredAt: new Date(end).toISOString() }] : [];
    });
    previous = allowStart && eligible() ? { at, context } : null;
    persist(); update();
  };
  const sync = async (): Promise<boolean> => {
    if (disposed || sending || now() < retryAt || storageError) return false;
    sending = true;
    try {
      const queues = storedQueues(), records = new Map<string, Interval>();
      let expired = 0, damaged = 0;
      const leases = new Map<string, string | null>();
      for (const [queueKey, values] of queues) {
        const lease = storage.getItem(leaseKey(queueKey));
        if (queueKey !== key && lease && now() - Number(lease) < BUFFER) continue;
        leases.set(queueKey, lease);
        for (const value of values) {
          const parsed = erpEventSchema.safeParse(value);
          if (!parsed.success || parsed.data.eventType !== "ACTIVE" || !parsed.data.startedAt) { damaged++; continue; }
          const event = parsed.data, end = +new Date(event.occurredAt);
          if (end < now() - MAX_AGE) { expired++; continue; }
          if (end <= now() - BUFFER && (rejectedUntil.get(event.id) || 0) <= now()) records.set(event.id, event);
        }
      }
      retainedWarning = [expired ? `${expired} pending records are older than seven days and retained locally.` : "", damaged ? `${damaged} invalid local records are retained for review.` : ""].filter(Boolean).join(" ");
      const batch = [...records.values()].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).slice(0, 50);
      if (!batch.length) return false;
      const response = await fetcher("/api/work-tracker/erp-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to synchronize ERP tracking");
      const submitted = new Set(batch.map(event => event.id));
      if (!Array.isArray(result.accepted) || result.accepted.some((id: unknown) => typeof id !== "string" || !submitted.has(id))) throw new Error("ERP returned an invalid event acknowledgement; pending work is retained.");
      if (disposed) return false;
      const accepted = new Set<string>(result.accepted);
      const filter = (values: unknown[]) => values.filter(value => !accepted.has((value as Interval | null)?.id || ""));
      // A newer sample may have arrived during the request. Never replace it with a snapshot.
      queue = filter(queue); persist();
      if (storageError) throw new Error(storageError);
      for (const [queueKey, lease] of leases) {
        if (queueKey !== key && storage.getItem(leaseKey(queueKey)) === lease) storage.setItem(queueKey, JSON.stringify(filter(read(queueKey))));
      }
      const rejected = batch.filter(event => !accepted.has(event.id));
      for (const event of rejected) rejectedUntil.set(event.id, now() + 5 * 60000);
      for (const id of accepted) rejectedUntil.delete(id);
      syncError = rejected.length ? `${rejected.length} intervals could not be accepted and remain queued. ${result.rejected?.[0]?.error || "They will retry automatically."}` : "";
      retryAt = 0; options.onSynced?.();
      return accepted.size === batch.length && records.size > batch.length;
    } catch (error) {
      syncError = error instanceof Error ? error.message : "Unable to synchronize ERP tracking";
      retryAt = now() + 60000; return false;
    } finally { sending = false; update(); }
  };
  return {
    sample, sync,
    interaction() {
      if (now() - lastInteraction >= IDLE) sample(false);
      lastInteraction = now();
      if (!previous && eligible()) { previous = { at: now(), context }; update(); }
    },
    changeContext(next: WorkContext) { sample(false); context = next; if (eligible()) previous = { at: now(), context }; update(); },
    togglePaused() { sample(false); paused = !paused; try { storage.setItem(pauseKey, String(paused)); } catch { /* Recording status still applies in this document. */ } if (eligible()) previous = { at: now(), context }; update(); },
    refreshPaused() {
      try {
        const next = storage.getItem(pauseKey) === "true";
        if (next === paused) return;
        sample(false); paused = next; if (eligible()) previous = { at: now(), context }; update();
      } catch { storageError = "Local storage is unavailable. Recording is paused to protect pending work."; update(); }
    },
    retry() {
      retryAt = 0; rejectedUntil.clear(); syncError = "";
      if (storageError) {
        try { if (!readable) { queue = read(key); readable = true; } storageError = ""; persist(); }
        catch { storageError = "Local tracking storage cannot be read. Existing records are preserved; recording is paused."; }
      }
      update(); return sync();
    },
    dispose() { sample(false); disposed = true; },
  };
}
