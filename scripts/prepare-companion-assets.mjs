import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";
const argument = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
if (!argument("--input")) throw new Error("Usage: node scripts/prepare-companion-assets.mjs --input <folder> [--ffmpeg <executable>] [--output <folder>]");
const source = path.resolve(argument("--input"));
const output = path.resolve(argument("--output") || "public/companion/khyati");
const catalog = JSON.parse(await fs.readFile(path.resolve(argument("--catalog") || "scripts/companion-asset-map.json"), "utf8"));
const sizes = [128, 256, 512];
const prepared = [];
const hash = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
// Normalize transparent margins only: never redraw, recolour or distort the supplied character.
for (const pose of catalog.poses) {
  if (!/^[a-z][a-z-]*$/.test(pose.id) || prepared.some(item => item.id === pose.id)) throw new Error("Invalid or duplicate pose ID");
  const file = path.resolve(source, pose.file);
  if (path.relative(source, file).startsWith("..")) throw new Error("Avatar input must stay inside the source folder");
  const input = await fs.readFile(file);
  const metadata = await sharp(input).metadata();
  const stats = await sharp(input).stats();
  if (metadata.format !== "png" || !metadata.hasAlpha || stats.isOpaque) throw new Error(`${pose.file} must be a genuinely transparent PNG`);
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = -1, bottom = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    // The supplied eraser exports leave faint alpha around the canvas border.
    // Locate the confident foreground, then keep padding for soft hair edges.
    if (data[(y * info.width + x) * info.channels + info.channels - 1] > 96) {
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left || bottom < top) throw new Error(`${pose.file} contains no visible character`);
  left = Math.max(0, left - 12); top = Math.max(0, top - 12);
  right = Math.min(info.width - 1, right + 12); bottom = Math.min(info.height - 1, bottom + 12);
  const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
  if (bounds.height < 256) throw new Error(`${pose.file} does not contain enough character detail`);
  prepared.push({ ...pose, input, bounds, sourceWidth: info.width, sourceHeight: info.height, sha256: hash(input) });
}
// Encode every output before activating the manifest. Original downloads are untouched.
await fs.mkdir(output, { recursive: true });
const poses = [];
for (const pose of prepared) {
  let bytes = 0;
  for (const size of sizes) {
    const side = Math.round(size * .94);
    const sprite = await sharp(pose.input).extract(pose.bounds).resize(side, side, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, position: "centre" }).extend({ top: Math.floor((size - side) / 2), bottom: Math.ceil((size - side) / 2), left: Math.floor((size - side) / 2), right: Math.ceil((size - side) / 2), background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 88, alphaQuality: 100 }).toBuffer();
    await fs.writeFile(path.join(output, `${pose.id}-${size}.webp`), sprite);
    bytes += sprite.length;
  }
  poses.push({ id: pose.id, label: pose.label, framing: pose.framing, file: pose.file, sourceWidth: pose.sourceWidth, sourceHeight: pose.sourceHeight, sha256: pose.sha256, bounds: pose.bounds, bytes });
}
let thinkingVideo = null;
if (catalog.video && argument("--ffmpeg")) {
  const input = path.resolve(source, catalog.video.file);
  const ffmpeg = path.resolve(argument("--ffmpeg"));
  const run = args => { const result = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8", windowsHide: true }); if (result.error || result.status !== 0) throw new Error(`Could not prepare thinking video: ${result.error?.message || result.stderr}`); };
  run(["-i", input, "-an", "-map_metadata", "-1", "-vf", "scale=360:640,fps=24", "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-y", path.join(output, "thinking.mp4")]);
  run(["-ss", "0", "-i", input, "-frames:v", "1", "-vf", "scale=256:456", "-y", path.join(output, "thinking-poster.webp")]);
  thinkingVideo = { src: "/companion/khyati/thinking.mp4", poster: "/companion/khyati/thinking-poster.webp", width: 360, height: 640, muted: true, hasBackground: true, bytes: (await fs.stat(path.join(output, "thinking.mp4"))).size, sourceSha256: hash(await fs.readFile(input)) };
}
const manifest = { ready: true, identity: catalog.identity || "KhyatiGems Companion", version: 2, canvas: { width: 512, height: 512 }, sizes, poses, thinkingVideo };
await fs.writeFile(path.join(output, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`Prepared ${poses.length} supplied poses in ${sizes.length} sizes; ${poses.reduce((total, pose) => total + pose.bytes, 0)} image bytes. Thinking video: ${thinkingVideo?.bytes || 0} bytes.`);
