import assert from "node:assert/strict";
import { createAutomaticTracking, type TrackingState } from "@/lib/work-tracker/automatic-tracking";
import { timeLabel } from "@/components/work-tracker/types";
import { routeWorkContext } from "@/lib/work-tracker/browser-context";
import { periodKeys } from "@/components/work-tracker/tracker-charts";

class MemoryStorage {
  values = new Map<string, string>();
  failWrites = false;
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] || null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { if (this.failWrites) throw new Error("Storage unavailable"); this.values.set(key, value); }
}
const key = "kg-work-intervals:alice:tab";
const context = { platform: "EBAY", activityType: "LISTING_PREPARATION" } as const;
type Event = { id: string; startedAt: string; occurredAt: string; platform: string };
const activeSeconds = (records: Event[]) => records.reduce((total, e) => total + (+new Date(e.occurredAt) - +new Date(e.startedAt)) / 1000, 0);
function fixture() {
  let at = Date.parse("2026-11-02T10:00:00Z"), focused = true;
  const storage = new MemoryStorage();
  let state: TrackingState | undefined;
  const batches: Event[][] = [];
  let responder: typeof fetch = async (_url, init) => {
    const batch = JSON.parse(init!.body as string).events;
    batches.push(batch); return Response.json({ accepted: batch.map((e: Event) => e.id) });
  };
  const event = (ago = 600000) => ({ id: crypto.randomUUID(), ...context, domain: "erp.khyatigems.com", eventType: "ACTIVE", startedAt: new Date(at - ago - 20000).toISOString(), occurredAt: new Date(at - ago).toISOString(), classificationOverride: true });
  const start = (ownerId = "tab") => createAutomaticTracking({ userId: "alice", ownerId, domain: "erp.khyatigems.com", context, storage, focused: () => focused, now: () => at, fetcher: (...args) => responder(...args), onChange: value => { state = value; } });
  return { storage, event, start, batches, advance: (ms: number) => { at += ms; }, focus: (value: boolean) => { focused = value; }, state: () => state!, time: () => at, respond: (value: typeof fetch) => { responder = value; }, records: (queueKey = key) => JSON.parse(storage.getItem(queueKey) || "[]") };
}

async function main() {
  {
    const f = fixture(), expired = f.event(8 * 86400000), valid = f.event(), invalid = { id: "damaged", data: "retain me" };
    f.storage.setItem(key, JSON.stringify([expired, invalid, valid]));
    const other = JSON.stringify([f.event()]); f.storage.setItem("kg-work-intervals:bob:tab", other);
    const tracker = f.start(); await tracker.sync();
    assert.deepEqual(f.batches.flat().map(e => e.id), [valid.id]);
    assert.deepEqual(f.records(), [expired, invalid], "expired and malformed work remains intact without blocking newer uploads");
    assert.equal(f.storage.getItem("kg-work-intervals:bob:tab"), other);
    assert.match(f.state().error, /older than seven days/);
    tracker.dispose();
  }
  {
    const f = fixture(), tracker = f.start(); tracker.sample();
    f.storage.setItem("kg-work-paused:alice", "true"); tracker.refreshPaused();
    assert.equal(f.state().paused, true, "privacy pause follows changes made by another tab");
    f.storage.setItem("kg-work-paused:alice", "false"); tracker.refreshPaused();
    for (let i = 1; i <= 17; i++) {
      f.advance(20000);
      if (i === 2) tracker.interaction();
      tracker.changeContext({ platform: i % 2 ? "ETSY" : "EBAY", activityType: "OTHER" });
    }
    assert.equal(f.state().active, false, "route/context changes cannot reset the idle clock");
    assert.equal(activeSeconds(f.records()), 40, "idle rollback preserves only time up to the last interaction");
    tracker.togglePaused(); tracker.togglePaused();
    assert.equal(f.state().active, false, "resuming cannot manufacture recent interaction");
    tracker.interaction(); f.advance(20000); tracker.sample();
    f.focus(false); f.advance(10000); tracker.sample(false);
    f.advance(600000); tracker.sample();
    assert.equal(activeSeconds(f.records()), 40, "the resumed idle interval is also rolled back and downtime is never bridged");
    tracker.togglePaused(); tracker.dispose();
    const next = f.start(); next.sample(); assert.equal(f.state().paused, true, "pause preference survives remounts"); next.dispose();
  }
  {
    let state: TrackingState | undefined;
    const denied = () => { throw new Error("Storage access denied"); };
    const tracker = createAutomaticTracking({ userId: "alice", ownerId: "denied", domain: "erp.khyatigems.com", context, storage: { get length() { return denied(); }, getItem: denied, setItem: denied, key: denied }, focused: () => true, onChange: value => { state = value; } });
    tracker.sample(); await tracker.retry(); assert.equal(state!.active, false); assert.match(state!.error, /storage/i); tracker.dispose();
  }
  {
    const f = fixture(), old = f.event(); f.storage.setItem(key, JSON.stringify([old]));
    let release!: (value: Response) => void;
    f.respond(async () => new Promise<Response>(resolve => { release = resolve; }));
    const tracker = f.start(); tracker.sample(); const uploading = tracker.sync();
    f.advance(20000); tracker.sample();
    release(Response.json({ accepted: [old.id] })); await uploading;
    assert.equal(f.records().length, 1); assert.notEqual(f.records()[0].id, old.id, "acknowledgements preserve activity collected during the request");
    tracker.dispose();
  }
  {
    const f = fixture(), event = f.event(); f.storage.setItem(key, JSON.stringify([event]));
    f.respond(async () => Response.json({ accepted: [event.id, "not-in-the-upload"] }));
    const tracker = f.start(); await tracker.sync(); assert.equal(f.records()[0].id, event.id);
    assert.match(f.state().error, /invalid event acknowledgement/); tracker.dispose();
  }
  {
    const f = fixture(), event = f.event(); f.storage.setItem(key, JSON.stringify([event]));
    const attempts: string[] = [];
    f.respond(async (_url, init) => { const batch = JSON.parse(init!.body as string).events; attempts.push(batch[0].id); if (attempts.length === 1) throw new Error("Offline"); return Response.json({ accepted: [event.id] }); });
    const tracker = f.start(); await tracker.sync(); await tracker.sync();
    assert.equal(attempts.length, 1); assert.equal(f.records().length, 1);
    await tracker.retry(); assert.deepEqual(attempts, [event.id, event.id]); assert.equal(f.records().length, 0); tracker.dispose();
  }
  {
    const f = fixture(), liveKey = "kg-work-intervals:alice:live", orphanKey = "kg-work-intervals:alice:orphan";
    const live = f.event(), orphan = f.event();
    f.storage.setItem(liveKey, JSON.stringify([live])); f.storage.setItem(liveKey.replace("intervals", "owner"), String(f.time()));
    f.storage.setItem(orphanKey, JSON.stringify([orphan]));
    const tracker = f.start(); await tracker.sync();
    assert.deepEqual(f.batches.flat().map(e => e.id), [orphan.id], "a live tab owns its idle buffer; only abandoned queues are recovered");
    assert.equal(f.records(liveKey)[0].id, live.id); assert.equal(f.records(orphanKey).length, 0); tracker.dispose();
  }
  {
    const f = fixture(), events = Array.from({ length: 51 }, () => f.event()); f.storage.setItem(key, JSON.stringify(events));
    let calls = 0;
    f.respond(async (_url, init) => { const batch = JSON.parse(init!.body as string).events; calls++; return Response.json({ accepted: calls === 1 ? [] : batch.map((e: Event) => e.id), rejected: [{ error: "Context mismatch" }] }); });
    const tracker = f.start(); await tracker.sync(); await tracker.sync();
    assert.equal(calls, 2); assert.equal(f.records().length, 50, "unaccepted records are retained while later valid intervals continue syncing"); tracker.dispose();
  }
  {
    const f = fixture(); f.storage.setItem(key, "damaged JSON must survive");
    const tracker = f.start(); tracker.sample(); await tracker.retry(); tracker.dispose();
    assert.equal(f.storage.getItem(key), "damaged JSON must survive"); assert.equal(f.state().active, false);
  }
  {
    const f = fixture(), tracker = f.start(); tracker.sample();
    f.advance(20000); f.storage.failWrites = true; tracker.sample();
    assert.equal(f.state().active, false);
    f.storage.failWrites = false; await tracker.retry();
    assert.equal(activeSeconds(f.records()), 20, "storage recovery persists buffered work instead of losing it"); tracker.dispose();
  }
  {
    const f = fixture(), old = f.event(); f.storage.setItem(key, JSON.stringify([old]));
    let release!: (value: Response) => void;
    f.respond(async () => new Promise<Response>(resolve => { release = resolve; }));
    const first = f.start(); const syncing = first.sync(); first.dispose();
    const second = f.start(); second.sample(); f.advance(20000); second.sample();
    release(Response.json({ accepted: [old.id] })); await syncing;
    assert.equal(f.records().length, 2, "an unmounted controller must not overwrite a newer controller's queue"); second.dispose();
  }
  assert.equal(timeLabel(20), "20s", "short synced work must not look like zero minutes");
  assert.equal(routeWorkContext("/inventory?search=orders-sync").activityType, "INVENTORY", "query text cannot change the route activity");
  assert.deepEqual(periodKeys("", "2026-11-02", true), [], "clearing a date filter cannot crash the charts");
  assert.deepEqual(periodKeys("2026-11-03", "2026-11-02", false), []);
  console.log("Automatic tracker regressions passed: idle, routes, pause persistence, offline recovery, age isolation, acknowledgement validation, concurrent collection, tab ownership and retained history");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
