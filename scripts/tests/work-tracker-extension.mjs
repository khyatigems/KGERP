import assert from "node:assert/strict";

// Exercise the actual service worker with browser APIs mocked at their boundary.
const listeners = {};
const event = name => ({ addListener(fn) { listeners[name] = fn; } });
let store = {}, idle = "active", focused = true, url = "https://www.ebay.com/itm/private?token=secret", now = Date.now();
const originalNow = Date.now;
Date.now = () => now;
let failed = true; const batches = [];
let holdFetch = false, releaseFetch;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (_url, init) => {
  const events = JSON.parse(init.body).events; batches.push(events);
  if (failed) throw new Error("offline");
  if (holdFetch) await new Promise(resolve => { releaseFetch = resolve; });
  return new Response(JSON.stringify({ accepted: events.map(e => e.id) }));
};
globalThis.chrome = {
  storage: { local: {
    async get(keys) { const list = typeof keys === "string" ? [keys] : keys; return structuredClone(Object.fromEntries(list.map(k => [k, store[k]]))); },
    async set(values) { Object.assign(store, structuredClone(values)); }, async setAccessLevel() {},
  } },
  idle: { setDetectionInterval() {}, async queryState() { return idle; }, onStateChanged: event("idle") },
  windows: { WINDOW_ID_NONE: -1, async getLastFocused() { return { id: 1, focused, state: focused ? "normal" : "minimized" }; }, onFocusChanged: event("focus") },
  tabs: { async query() { return [{ url, active: true }]; }, onActivated: event("tab"), onUpdated: event("update"), onRemoved: event("remove") },
  alarms: { async create() {}, onAlarm: event("alarm") },
  action: { async setBadgeText() {}, async setBadgeBackgroundColor() {}, async setTitle() {} },
  runtime: { id: "test-extension", getURL(p) { return `chrome-extension://test-extension/${p}`; }, onInstalled: event("installed"), onStartup: event("startup"), onMessage: event("message") },
};
async function flush() { await new Promise(resolve => setImmediate(resolve)); }
async function tick(seconds = 30) { now += seconds * 1000; listeners.alarm({ name: "work-tracker" }); await flush(); }
async function message(action, extra = {}) {
  return new Promise(resolve => listeners.message({ action, ...extra }, { id: chrome.runtime.id, url: chrome.runtime.getURL("src/popup.html") }, resolve));
}
try {
  await import("../../extensions/work-tracker/src/service-worker.js");
  store.settings = { erpUrl: "https://erp.khyatigems.com", token: `kgwt_${"x".repeat(43)}`, idleSeconds: 60, enabled: false, activityType: "LISTING_CREATION", platform: "AUTO" };
  listeners.installed(); await flush();
  assert.equal((await message("start")).ok, true);
  await tick(); assert.equal(store.queue.filter(e => e.eventType === "ACTIVE").length, 1);
  await tick();
  idle = "idle"; listeners.idle("idle"); await flush();
  assert.equal(store.queue.filter(e => e.eventType === "ACTIVE").length, 0); assert.equal(store.active, false);
  idle = "active"; listeners.idle("active"); await flush();
  await tick(); focused = false; listeners.focus(-1); await flush();
  const activeCount = store.queue.filter(e => e.eventType === "ACTIVE").length;
  await tick(); assert.equal(store.queue.filter(e => e.eventType === "ACTIVE").length, activeCount);
  focused = true; listeners.focus(1); await flush();
  for (const host of ["www.etsy.com", "sellercentral.amazon.in", "erp.khyatigems.com"]) { url = `https://${host}/private`; listeners.tab(); await flush(); await tick(); }
  assert.deepEqual([...new Set(store.queue.filter(e => e.eventType === "ACTIVE").map(e => e.platform))].sort(), ["AMAZON", "EBAY", "ETSY"]);
  url = "https://www.ebay.com/seller"; listeners.tab(); await flush();
  assert.ok(store.queue.every(e => !JSON.stringify(e).includes("private") && !JSON.stringify(e).includes("secret")));
  const beforeRestart = store.queue.filter(e => e.eventType === "ACTIVE").length;
  now += 3600000; listeners.startup(); await flush();
  assert.equal(store.queue.filter(e => e.eventType === "ACTIVE").length, beforeRestart);
  assert.ok(store.lastError.includes("offline"));
  const failedIds = batches.at(-1).map(e => e.id);
  failed = false; await message("sync"); await flush();
  assert.ok(failedIds.every(id => batches.at(-1).some(e => e.id === id)));
  assert.ok(store.queue.every(e => !failedIds.includes(e.id)));
  await tick(); await message("pause"); assert.equal(store.active, false);
  const paused = store.queue.length; await tick(); assert.equal(store.queue.length, paused);
  await message("resume"); await tick(); await message("stop"); assert.equal(store.settings.enabled, false);
  await message("clearQueue"); assert.equal(store.queue.length, 0);
  await message("start"); await tick();
  const activeSeconds = () => store.queue.filter(e => e.eventType === "ACTIVE").reduce((total, e) => total + (+new Date(e.occurredAt) - +new Date(e.startedAt)) / 1000, 0);
  assert.equal(activeSeconds(), 30);
  idle = "locked"; listeners.idle("locked"); await flush();
  assert.equal(activeSeconds(), 30, "Locking must preserve preceding productive time");
  assert.equal(store.active, false);
  await tick(); assert.equal(activeSeconds(), 30, "Locked time must not accumulate");
  idle = "active"; listeners.idle("active"); await flush();
  await tick(); assert.equal(activeSeconds(), 60, "Tracking resumes after unlock");
  await message("stop");
  const nearExpiry = new Date(now - 7 * 86400000 + 60000).toISOString();
  store.queue = [{ id: crypto.randomUUID(), platform: "ERP", domain: "erp.khyatigems.com", eventType: "TAB_SWITCH", occurredAt: nearExpiry, activityType: "OTHER", classificationOverride: false }];
  await message("sync"); assert.equal(store.queue.length, 0, "Records just under seven days must still sync");
  await message("start"); await tick(); await message("stop");
  now += 200000;
  holdFetch = true;
  const uploading = message("sync"); await flush();
  assert.equal(typeof releaseFetch, "function");
  let startedDuringUpload = false;
  const starting = message("start").then(() => { startedDuringUpload = true; }); await flush();
  assert.equal(startedDuringUpload, true, "Uploads must not block tracking controls");
  await tick();
  focused = false; listeners.focus(-1); await flush();
  assert.equal(store.active, false, "Focus loss must be handled while upload is pending");
  const currentIntervalIds = store.queue.filter(e => e.eventType === "ACTIVE" && +new Date(e.occurredAt) > now - 60000).map(e => e.id);
  assert.ok(currentIntervalIds.length > 0);
  holdFetch = false; releaseFetch(); await uploading; await starting;
  assert.ok(currentIntervalIds.every(id => store.queue.some(e => e.id === id)), "Upload acknowledgements must preserve newly collected intervals");
  console.log("Extension worker integration passed: idle trimming, focus/minimize, platform switches, restart, privacy, offline retry, start/pause/resume/stop");
} finally { Date.now = originalNow; globalThis.fetch = originalFetch; delete globalThis.chrome; }
