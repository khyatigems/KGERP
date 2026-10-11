import assert from "node:assert/strict";
import { invalidateCache, withCache } from "../../lib/simple-cache";
import { parseWorkspaceAppearance } from "../../lib/workspace-appearance";

async function main() {
  invalidateCache();
  let reads = 0;
  let finish!: (value: number) => void;
  const load = () => { reads++; return new Promise<number>(resolve => { finish = resolve; }); };
  const first = withCache("dashboard:test", 10_000, load);
  const second = withCache("dashboard:test", 10_000, load);
  await Promise.resolve();
  assert.equal(reads, 1, "Concurrent cold requests should share one database load");
  finish(7);
  assert.deepEqual(await Promise.all([first, second]), [7, 7]);
  assert.equal(await withCache("dashboard:test", 10_000, async () => 9), 7);
  invalidateCache("dashboard:");
  const stale = withCache("dashboard:test", 10_000, load);
  await Promise.resolve();
  invalidateCache("dashboard:");
  finish(10);
  await stale;
  assert.equal(await withCache("dashboard:test", 10_000, async () => 11), 11, "Invalidated in-flight data must stay invalidated");
  await assert.rejects(withCache("dashboard:error", 10_000, async () => { throw Error("unavailable"); }));
  assert.equal(await withCache("dashboard:error", 10_000, async () => 12), 12);
  assert.equal(parseWorkspaceAppearance({ dashboardView: "classic", motion: false }).dashboardView, "classic");
  assert.equal(parseWorkspaceAppearance({ dashboardView: "invalid" }).dashboardView, "trading");
  assert.equal(parseWorkspaceAppearance({ palette: "royal" }).palette, "amethyst-prism");
  console.log("Dashboard cache concurrency, invalidation, failure recovery, and view preferences passed");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
