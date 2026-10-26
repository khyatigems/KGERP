import assert from "node:assert/strict";
import { companionVisibility, publishCompanionVisibility, registerCompanionVisibility, toggleCompanionVisibility } from "../../lib/companion-visibility";

async function main() {
  let calls = 0;
  const stop = registerCompanionVisibility(async () => { calls++; return {}; });
  publishCompanionVisibility(false, false);
  await toggleCompanionVisibility();
  assert.equal(calls, 0, "small screens cannot activate a hidden companion");
  publishCompanionVisibility(false, true);
  await toggleCompanionVisibility();
  assert.equal(companionVisibility.getSnapshot().enabled, true);
  assert.equal(calls, 1);
  publishCompanionVisibility(true, false);
  assert.equal(companionVisibility.getSnapshot().enabled, true, "responsive hiding retains the desktop preference");
  assert.equal(calls, 1, "responsive hiding never saves disabled preferences");
  stop();
  assert.equal(companionVisibility.getSnapshot().available, false);

  const stopFailure = registerCompanionVisibility(async () => ({ error: "Save failed" }));
  publishCompanionVisibility(true, true);
  await toggleCompanionVisibility();
  assert.equal(companionVisibility.getSnapshot().enabled, true, "failed hide rolls back");
  assert.equal(companionVisibility.getSnapshot().error, "Save failed");
  stopFailure();

  let finish!: (result: { error?: string }) => void;
  calls = 0;
  const stopPending = registerCompanionVisibility(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  publishCompanionVisibility(false, true);
  const pending = toggleCompanionVisibility();
  assert.equal(companionVisibility.getSnapshot().pending, true);
  await toggleCompanionVisibility();
  assert.equal(calls, 1, "repeated clicks cannot submit duplicate saves");
  stopPending();
  finish({});
  await pending;
  assert.equal(companionVisibility.getSnapshot().available, false, "late save cannot revive an unmounted user's controls");
  console.log("Companion visibility passed: responsive preference retention, quick toggle, failure rollback, duplicate-save prevention and teardown.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
