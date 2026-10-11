import assert from "node:assert/strict";
import { runEtsyDraftBatch } from "../../lib/marketplace/etsy-draft-batch";
async function main() {
 const visited: string[] = [];
 const failed: string[] = [];
 const items = [{ key: "saved", saved: true }, { key: "previous failure", failed: true }, { key: "1" }, { key: "2" }, { key: "3" }];
 await runEtsyDraftBatch(items, 5, async (item) => { visited.push(item.key); if (item.key === "2") throw new Error("HTTP 400"); }, () => false, (item) => failed.push(item.key));
 assert.deepEqual(visited, ["1", "2", "3"]); assert.deepEqual(failed, ["2"]);
 let stop = false; const stopped: string[] = [];
 await runEtsyDraftBatch(items, 5, async (item) => { stopped.push(item.key); stop = true; }, () => stop, () => {});
 assert.deepEqual(stopped, ["1"]);
 await assert.rejects(runEtsyDraftBatch([{ key: "same" }, { key: "same" }], 5, async () => {}, () => false, () => {}), /only once/);
 await assert.rejects(runEtsyDraftBatch(items, 26, async () => {}, () => false, () => {}), /1 to 25/);
 console.log("Etsy batch failure, duplicate and stop regression tests passed.");
}
void main();
