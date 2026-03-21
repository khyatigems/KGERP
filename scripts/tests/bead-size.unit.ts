import assert from "node:assert";
import { isValidBeadSizeLabel, normalizeBeadSizeLabel, parseBeadSizeMm } from "../../lib/bead-size";

assert.equal(normalizeBeadSizeLabel(" 4mm - 6mm "), "4mm-6mm");
assert.equal(normalizeBeadSizeLabel("xs - l"), "XS-L");
assert.equal(normalizeBeadSizeLabel("A—Grade"), "A-GRADE");

assert.equal(parseBeadSizeMm("8mm"), 8);
assert.equal(parseBeadSizeMm("8.5mm"), 8.5);
assert.equal(parseBeadSizeMm("4mm-6mm"), undefined);
assert.equal(parseBeadSizeMm("XS-L"), undefined);

assert.ok(isValidBeadSizeLabel("4mm-6mm"));
assert.ok(isValidBeadSizeLabel("A-GRADE"));
assert.ok(!isValidBeadSizeLabel("4mm@6mm"));

