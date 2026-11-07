import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { companionAvatarPath, companionEventExpression, companionPoseForState, companionPoses, companionThinkingVideo, officialCompanionAssetsReady } from "../../lib/companion-avatar";
import { parseCompanionPreferences } from "../../lib/companion";

async function main() {
  assert.equal(officialCompanionAssetsReady, true);
  assert.equal(companionEventExpression("success"), "success");
  assert.equal(companionEventExpression("error"), "alert");
  assert.equal(companionEventExpression("warning"), "concerned");
  assert.equal(companionPoses.length, 22, "all supplied PNG poses are retained");
  assert.equal(new Set(companionPoses.map(pose => pose.id)).size, 22);
  assert.equal(parseCompanionPreferences('{"enabled":true}').framing, "portrait", "existing preferences retain a readable default");
  for (const [state, portrait, full] of [
    ["idle", "idle", "idle-full"], ["greeting", "greeting", "wave-full"],
    ["working", "working", "working"], ["thinking", "thinking", "thinking-full"],
    ["success", "success", "celebrating"], ["warning", "concerned", "concerned-full"],
    ["sleeping", "rest", "rest-lounge"], ["speaking", "speaking", "speaking-full"],
  ]) {
    assert.equal(companionPoseForState(state, "portrait"), portrait);
    assert.equal(companionPoseForState(state, "full-body"), full);
  }
  for (const pose of companionPoses) for (const size of [128, 256, 512] as const) {
    const filename = path.join(process.cwd(), "public", companionAvatarPath(pose.id, size));
    const { data, info } = await sharp(filename).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, size); assert.equal(info.height, size);
    let opaque = 0, transparent = 0, right = 0, bottom = 0;
    let left: number = size;
    let top: number = size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const alpha = data[(y * size + x) * 4 + 3];
      if (alpha === 0) transparent++;
      if (alpha > 128) { opaque++; left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
    }
    assert.ok(transparent > size * size * .1, `${pose.id} retains real transparent space`);
    assert.ok(opaque > size * size * .1, `${pose.id} has a visible character`);
    assert.ok(Math.max(right - left, bottom - top) > size * .8, `${pose.id} fills the presentation canvas instead of retaining export margins`);
  }
  assert.ok(companionThinkingVideo);
  assert.ok((await readFile(path.join("public", companionThinkingVideo.src))).length < 250000, "thinking clip has a bounded delivery size");
  assert.ok(await sharp(path.join("public", companionThinkingVideo.poster)).metadata());
  console.log("Companion asset checks passed: 22 poses, 66 transparent optimized images, readable framing, legacy defaults, event mapping and bounded thinking media.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
