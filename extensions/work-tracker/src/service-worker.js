import { trustedErpSender, connectFromErp } from "./erp-connection.js";
import { defaults, validateSettings, sendEvents } from "./api-client.js";
import { eligibleTab } from "./platform-detection.js";
import { sliceInterval, removeIdle, readyEvents, acknowledge } from "./activity-tracker.js";

// Serialize state changes; network requests must not block focus/idle sampling.
let chain = Promise.resolve();
let syncInFlight = null;
const ALARM_NAME = "work-tracker";
const SYNC_RETRY_ALARM = "work-tracker-sync-retry";
const SYNC_INTERVAL_MINUTES = 1;
function schedule(fn, onError, propagate = false) { chain = chain.catch(() => {}).then(fn).catch(async error => { await chrome.storage.local.set({ lastError: error.message }); await badge(false, "!"); onError?.(error); if (propagate) throw error; }); return chain; }
async function settings() { return { ...defaults, ...(await chrome.storage.local.get("settings")).settings }; }
async function scheduleUploadAlarm(at) {
  await chrome.alarms.clear(SYNC_RETRY_ALARM);
  if (at > Date.now()) await chrome.alarms.create(SYNC_RETRY_ALARM, { when: at });
}
async function scheduleEligibleUpload(queue, idleSeconds) {
  const next = Math.min(...queue.filter(e => +new Date(e.occurredAt) > Date.now() - (idleSeconds * 1000 + 90000)).map(e => +new Date(e.occurredAt) + (idleSeconds * 1000 + 90000)));
  if (Number.isFinite(next)) await scheduleUploadAlarm(next);
}
async function badge(active, text) { await chrome.action.setBadgeText({ text: text || (active ? "ON" : "OFF") }); await chrome.action.setBadgeBackgroundColor({ color: active ? "#15803d" : "#64748b" }); await chrome.action.setTitle({ title: active ? "Work Tracker — estimating active work" : "Work Tracker — paused / idle / unsupported tab" }); }
async function sample(eventType = "TAB_SWITCH", reset = false, idleOverride = null) {
  const config = await settings();
  chrome.idle.setDetectionInterval(config.idleSeconds);
  const saved = await chrome.storage.local.get(["previous", "queue"]);
  let queue = saved.queue || []; const now = Date.now();
  const idle = idleOverride || await chrome.idle.queryState(config.idleSeconds);
  let window; try { window = await chrome.windows.getLastFocused(); } catch { /* No browser windows */ }
  const tabs = window?.focused && window.state !== "minimized" ? await chrome.tabs.query({ active: true, windowId: window.id }) : [];
  const eligible = eligibleTab(tabs[0], !!window?.focused && window.state !== "minimized", idle, new URL(config.erpUrl).hostname);
  // After a browser restart no interval bridges the downtime. Large alarm gaps are discarded.
  const interval = !reset ? sliceInterval(saved.previous, now) : null;
  if (interval) queue.push(interval);
  // Locking is immediate, unlike the inactivity threshold. Preserve work done
  // just before a lock; only an actual idle transition rolls back idle time.
  if (idle === "idle") queue = removeIdle(queue, now - config.idleSeconds * 1000);
  const next = config.enabled && eligible && eligible.platform !== "ERP" ? { ...eligible, platform: eligible.platform, classificationOverride: false, at: now, activityType: "OTHER" } : null;
  const transition = saved.previous || next;
  if (transition && eventType !== "HEARTBEAT") queue.push({ id: crypto.randomUUID(), platform: transition.platform, domain: transition.domain, classificationOverride: transition.classificationOverride, activityType: transition.activityType, eventType: idle !== "active" ? "IDLE" : eventType, occurredAt: new Date(now).toISOString() });
  // Stop collecting at capacity and surface an actionable error; never silently evict unsent data.
  if (queue.length > 10000) { config.enabled = false; await chrome.storage.local.set({ settings: config, lastError: "Queue full: tracking paused. Reconnect and sync before resuming." }); }
  await chrome.storage.local.set({ queue, previous: config.enabled ? next : null, active: !!next && config.enabled });
  await badge(!!next && config.enabled);
}
function sync() {
  if (syncInFlight) return syncInFlight;
  syncInFlight = performSync().catch(async error => { await schedule(async () => { await chrome.storage.local.set({ lastError: error.message }); await badge(false, "!"); }); return { error: error.message }; }).finally(() => { syncInFlight = null; });
  return syncInFlight;
}
async function performSync() {
  const config = await settings();
  if (!config.token) return { error: "Connect the extension in Connection settings first." };
  const stored = await chrome.storage.local.get(["queue", "retryAt", "failures"]);
  if ((stored.retryAt || 0) > Date.now()) {
    await scheduleUploadAlarm(stored.retryAt);
    return { ok: true, message: "Waiting before retrying the connection." };
  }
  let queue = stored.queue || [];
  // Server accepts seven days of offline history. Expired records are retained for inspection.
  const expired = queue.filter(e => +new Date(e.occurredAt) < Date.now() - 7 * 86400000);
  if (expired.length) { const error = "Some queued records are over seven days old. Export or clear the queue in Settings."; await schedule(() => chrome.storage.local.set({ lastError: error })); return { error }; }
  const batch = readyEvents(queue, Date.now(), config.idleSeconds).slice(0, 100);
  if (!batch.length) {
    await scheduleEligibleUpload(queue, config.idleSeconds);
    return { ok: true, message: queue.length ? "Recent activity is still in the idle safety buffer. It uploads automatically when eligible." : "No pending activity. Open a supported marketplace and enable automatic tracking." };
  }
  try {
    const ids = await sendEvents(config, batch);
    await schedule(async () => {
      const currentConfig = await settings();
      if (currentConfig.token !== config.token || currentConfig.erpUrl !== config.erpUrl) throw new Error("ERP connection changed while syncing. The records remain queued; sync again with the original ERP connection.");
      const current = await chrome.storage.local.get("queue");
      // New intervals can arrive during an upload. Acknowledge against the
      // latest queue rather than replacing it with the old request snapshot.
      queue = acknowledge(current.queue || [], ids);
      await chrome.storage.local.set({ queue, failures: 0, retryAt: 0, lastError: "", lastSync: new Date().toISOString() });
      await scheduleUploadAlarm(0);
      if (queue.length) await scheduleEligibleUpload(queue, config.idleSeconds);
    }, undefined, true);
    return { ok: true, message: ids.length === batch.length ? `${ids.length} records synchronized. Recent records may still be in the idle safety buffer.` : `${ids.length} of ${batch.length} records accepted. Unaccepted records remain queued for retry.` };
  } catch (error) {
    const failures = (stored.failures || 0) + 1;
    const retryAt = Date.now() + Math.min(3600000, 30000 * 2 ** Math.min(failures, 7));
    await schedule(async () => {
      const currentConfig = await settings();
      if (currentConfig.token !== config.token || currentConfig.erpUrl !== config.erpUrl) return;
      await chrome.storage.local.set({ failures, retryAt, lastError: error.message });
      await scheduleUploadAlarm(retryAt);
      await badge(false, "!");
    });
    return { error: error.message };
  }
}
chrome.runtime.onInstalled.addListener(() => schedule(async () => { await chrome.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }); await chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES }); await sample("TAB_SWITCH", true); }));
chrome.runtime.onStartup.addListener(() => schedule(async () => { await chrome.alarms.create(ALARM_NAME, { periodInMinutes: SYNC_INTERVAL_MINUTES }); await sample("TAB_SWITCH", true); }).then(() => sync()));
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ALARM_NAME) schedule(() => sample("HEARTBEAT")).then(() => sync());
  else if (alarm.name === SYNC_RETRY_ALARM) { schedule(() => sample("HEARTBEAT")).then(() => sync()); }
});
chrome.tabs.onActivated.addListener(() => schedule(() => sample("TAB_SWITCH")));
chrome.tabs.onUpdated.addListener((_id, change, tab) => { if (change.url && tab.active) schedule(() => sample("TAB_SWITCH")); });
chrome.tabs.onRemoved.addListener(() => schedule(() => sample("TAB_SWITCH")));
chrome.windows.onFocusChanged.addListener(id => schedule(() => sample(id === chrome.windows.WINDOW_ID_NONE ? "WINDOW_BLUR" : "WINDOW_FOCUS")));
chrome.idle.onStateChanged.addListener(state => schedule(() => sample(state === "active" ? "WINDOW_FOCUS" : "IDLE", false, state)));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL("src/"))) return false;
  let responded = false;
  const reply = result => { if (responded) return; responded = true; try { respond(result); } catch { /* The extension page may have closed while this operation ran. */ } };
  if (message.action === "sync") {
    schedule(() => chrome.storage.local.set({ retryAt: 0 }), error => reply({ error: error.message }), true)
      .then(() => sync()).then(result => reply(result || { ok: true }), error => reply({ error: error.message }));
    return true;
  }
  schedule(async () => {
    if (message.action === "configure") {
      const old = await settings(); const next = validateSettings({ ...old, ...message.settings });
      await sample("TAB_SWITCH");
      const { queue } = await chrome.storage.local.get("queue");
      if ((next.erpUrl !== old.erpUrl || next.token !== old.token) && queue?.length) throw new Error("Sync or export and clear the pending queue before changing ERP or credential");
      await chrome.storage.local.set({ settings: { ...next, enabled: false }, previous: null }); await sample("TAB_SWITCH", true);
    } else if (["start", "resume", "pause", "stop"].includes(message.action)) {
      await sample("TAB_SWITCH");
      const config = await settings(); const enabled = ["start", "resume"].includes(message.action);
      if (enabled) validateSettings(config);
      const activityType = message.activityType || config.activityType, platform = message.platform || config.platform;
      if (!["LISTING_PREPARATION", "LISTING_CREATION", "SEO", "IMAGES", "INVENTORY", "ORDERS", "CUSTOMER_SERVICE", "SYNCHRONIZATION", "TROUBLESHOOTING", "OTHER"].includes(activityType) || !["AUTO", "ERP", "EBAY", "ETSY", "AMAZON"].includes(platform)) throw new Error("Invalid activity or platform");
      await chrome.storage.local.set({ settings: { ...config, enabled, activityType, platform }, previous: null }); await sample("TAB_SWITCH", true);
    } else if (message.action === "disconnect") {
      await sample("TAB_SWITCH");
      const { queue = [] } = await chrome.storage.local.get("queue");
      if (queue.length) throw new Error("Sync or export and clear pending records before disconnecting.");
      await chrome.storage.local.set({ settings: { ...defaults }, previous: null, active: false });
      await badge(false);
    } else if (message.action === "clearQueue") { await chrome.storage.local.set({ queue: [], previous: null, lastError: "", settings: { ...await settings(), enabled: false } }); await badge(false); }
    else { reply({ error: "Unknown action" }); return; }
    reply({ ok: true });
  }, error => reply({ error: error.message }));
  return true;
});

// Only explicitly allowed ERP pages can pair. Never return a credential to a page.
chrome.runtime.onMessageExternal.addListener((message, sender, respond) => {
  if (!trustedErpSender(sender)) return false;
  if (!["erp-status", "erp-connect"].includes(message?.action)) return false;
  schedule(async () => {
    const old = await settings();
    if (message.action === "erp-status") {
      respond({ ok: true, connected: !!old.token, browserName: old.browserName || "" });
      return;
    }
    const { queue = [] } = await chrome.storage.local.get("queue");
    const next = await connectFromErp(message, sender, old, queue);
    await chrome.storage.local.set({ settings: next, previous: null, lastError: "" });
    await sample("TAB_SWITCH", true);
    respond({ ok: true });
  }, error => respond({ error: error.message }));
  return true;
});
