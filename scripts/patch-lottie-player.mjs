#!/usr/bin/env node
/**
 * Patches @lottiefiles/react-lottie-player so the internal `enterFrame`
 * listener no longer calls setState() on every animation frame.
 *
 * Why: each frame (~60/s per playing animation) triggered a React update at
 * DefaultLane priority, which preempts and restarts App Router's Transition
 * render of large pages (e.g. /inventory). The page content never finished
 * committing while any lottie was playing, causing an infinite render loop,
 * hundreds of thousands of discarded DOM nodes and browser OOM crashes.
 *
 * The `seeker` state is only used by the debug/seeker UI which this app does
 * not use, so dropping the per-frame setState is behavior-preserving here.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgDir = join(root, "node_modules", "@lottiefiles", "react-lottie-player");

const PATTERN = /,d\.setState\(\{seeker:Math\.floor\(m\.currentFrame\)\}\)/g;

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (e !== "stories") walk(p, out);
    } else if (/\.(js|mjs|cjs)$/.test(e) && !e.endsWith(".map")) {
      out.push(p);
    }
  }
  return out;
}

if (!statSync(pkgDir, { throwIfNoEntry: false })) {
  console.log("patch-lottie-player: package not installed, skipping");
  process.exit(0);
}

let patched = 0;
for (const file of walk(pkgDir)) {
  const src = readFileSync(file, "utf8");
  if (!src.includes("seeker:Math.floor(m.currentFrame)")) continue;
  PATTERN.lastIndex = 0;
  const next = src.replace(PATTERN, "");
  if (next !== src) {
    writeFileSync(file, next);
    patched++;
    console.log(`patch-lottie-player: patched ${file.replace(/\\/g, "/")}`);
  }
}

if (patched === 0) {
  console.log("patch-lottie-player: already patched (or pattern not found)");
}
