import { businessStoryKey, associateFeedbackEvent, feedbackEventKey, clearFeedbackEvent } from "../../lib/business-event-identity";
import assert from "node:assert/strict";
import { companionDefaults, companionSchema, companionQuietHours, canCompanionInterrupt, notificationCategory } from "../../lib/companion";
import { companionInterruptionDelay, claimCompanionInterruptions } from "../../lib/companion-interruptions";
assert.equal(businessStoryKey("report-export:job:completed"), "report-export:job");
assert.equal(businessStoryKey("report-export:job:failed"), "report-export:job");
associateFeedbackEvent("inventory-progress", "inventory-created:item");
assert.equal(feedbackEventKey("inventory-progress"), "inventory-created:item");
clearFeedbackEvent("inventory-progress");
assert.equal(feedbackEventKey("inventory-progress"), "inventory-progress");
const prefs = companionSchema.parse({ severity: "attention", quietHours: { enabled: true, start: "22:00", end: "08:00" } });
assert.equal(companionQuietHours(prefs, new Date(2026, 10, 6, 23)), true);
assert.equal(companionQuietHours(prefs, new Date(2026, 10, 6, 7)), true);
assert.equal(companionQuietHours(prefs, new Date(2026, 10, 6, 8)), false);
const noon = new Date(2026, 10, 6, 12);
assert.equal(canCompanionInterrupt(prefs, { type: "success" }, noon), false);
assert.equal(canCompanionInterrupt(prefs, { type: "error" }, noon), true);
assert.equal(canCompanionInterrupt(prefs, { type: "error", resolvedAt: noon.toISOString() }, noon), false);
assert.equal(canCompanionInterrupt(prefs, { type: "error", snoozedUntil: new Date(noon.getTime() + 60000).toISOString() }, noon), false);
assert.equal(canCompanionInterrupt({ ...prefs, mutedCategories: ["marketplace"] }, { type: "error", eventKey: "marketplace-sync:1" }, noon), false);
assert.equal(notificationCategory("report-export:1:failed"), "reports");
assert.equal(companionSchema.safeParse({ quietHours: { enabled: true, start: "25:00", end: "08:00" } }).success, false);
assert.equal(companionDefaults.quietHours.enabled, false);
const memory = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", { value: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) }, configurable: true });
// Exercise the storage fallback and bounded ledger using two simulated tabs.
async function main() {
  assert.deepEqual(await claimCompanionInterruptions("alice", ["event:1", "event:1"], 100000), ["event:1"]);
  assert.deepEqual(await claimCompanionInterruptions("alice", ["event:1", "event:2"], 100001), []);
  assert.equal(companionInterruptionDelay("alice", 100001), 29999);
  assert.equal(companionInterruptionDelay("alice", 131000), 0);
  assert.deepEqual(await claimCompanionInterruptions("alice", ["event:1", "event:2"], 131000), ["event:2"]);
  assert.deepEqual(await claimCompanionInterruptions("bob", ["event:1"], 100001), ["event:1"]);
  console.log("Companion policy passed: shared severity, overnight quiet hours, snooze, recovery, categories, cooldown and account isolation.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
