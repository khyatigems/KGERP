import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { APPEARANCE_BOOTSTRAP, DEFAULT_APPEARANCE, parseWorkspaceAppearance } from "../../lib/workspace-appearance";

assert.deepEqual(parseWorkspaceAppearance(null), DEFAULT_APPEARANCE);
assert.deepEqual(parseWorkspaceAppearance({ surface: "invalid", sidebar: 123, density: null, textSize: [] }), DEFAULT_APPEARANCE);
const legacy = parseWorkspaceAppearance({ palette: "royal", motion: false, dashboardView: "classic" });
assert.equal(legacy.palette, "amethyst-prism");
assert.equal(legacy.motion, false);
assert.equal(legacy.surface, "slate");
const saved = { ...DEFAULT_APPEARANCE, surface: "stone", sidebar: "dark", density: "compact", textSize: "large" };
assert.deepEqual(parseWorkspaceAppearance(saved), saved);
const dataset: Record<string, string> = {};
runInNewContext(APPEARANCE_BOOTSTRAP, {
  document: { documentElement: { dataset } },
  localStorage: { getItem: (key: string) => key === "theme" ? "dim" : JSON.stringify(saved) },
});
assert.equal(dataset.workspaceMode, "dim");
assert.equal(dataset.surface, "stone");
assert.equal(dataset.sidebar, "dark");
assert.equal(dataset.density, "compact");
assert.equal(dataset.textSize, "large");
assert.equal(dataset.workspaceTheme, saved.palette);
assert.equal(parseWorkspaceAppearance(JSON.parse(JSON.stringify(saved))).density, "compact");
console.log("Appearance migration, validation, persistence and first-paint preferences passed");
