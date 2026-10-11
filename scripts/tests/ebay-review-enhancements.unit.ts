import assert from "node:assert/strict";
import sharp from "sharp";
import { buildEbayStaticDescription } from "../../lib/marketplace/ebay-description-html";
import { runEbayBatch, validateEbayBatchSelection } from "../../lib/marketplace/ebay-batch";
import { normalizeEbayReviewImage } from "../../lib/marketplace/ebay-review-image";

const html = buildEbayStaticDescription('<div style="background:#F8F9FB;display:flex;flex-wrap:wrap;gap:12px;border:1px solid #E0E3EA;border-radius:12px;box-shadow:0 2px 8px #181B4E11;width:calc(50% - 6px);white-space:pre-line"><img src="https://example.test/gem.jpg" style="display:block;width:100%;height:auto;object-fit:cover" onerror="bad()"><script>bad()</script></div>');
for (const rule of ["display:flex", "flex-wrap:wrap", "border-radius:12px", "background:#F8F9FB", "width:calc(50% - 6px)", "height:auto", "white-space:pre-line"]) assert.ok(html.includes(rule), rule);
assert.ok(!/onerror|<script/i.test(html));
assert.ok(!buildEbayStaticDescription('<p style="background:url(javascript:bad());width:expression(bad())">Gem</p>').includes("style="));
assert.ok(!buildEbayStaticDescription('<img src="java&#115;cript:bad()">').includes("src="));
const rows = Array.from({ length: 6 }, (_, index) => ({ id: String(index), sku: `SKU${index}`, shopId: "shop" }));
validateEbayBatchSelection(rows);
assert.throws(() => validateEbayBatchSelection([]), /Select between/);
assert.throws(() => validateEbayBatchSelection([...rows, rows[0]]), /one draft per SKU/);
assert.throws(() => validateEbayBatchSelection(Array.from({ length: 26 }, (_, index) => ({ id: String(index), sku: String(index), shopId: "shop" }))), /25/);

async function main() {
  const calls: string[] = [];
  const outcomes: string[] = [];
  await runEbayBatch(rows, async (row) => { calls.push(row.id); if (row.id === "1") throw new Error("Rejected by eBay"); return row.sku; }, () => false, (row, result) => outcomes.push(`${row.id}:${result.error || result.value}`));
  assert.equal(calls.length, 6);
  assert.equal(calls.filter((id) => id === "1").length, 1, "Failures are not retried");
  assert.equal(outcomes[1], "1:Rejected by eBay");
  assert.equal(outcomes[5], "5:SKU5", "Partial failures do not hide later results");
  calls.length = 0;
  await runEbayBatch(rows, async (row) => { calls.push(row.id); return row.sku; }, () => calls.length >= 2, () => {});
  assert.equal(calls.length, 2, "Stop must leave remaining items untouched");
  const tiny = await sharp({ create: { width: 100, height: 100, channels: 3, background: "blue" } }).png().toBuffer();
  await assert.rejects(normalizeEbayReviewImage(tiny), /500 pixels/);
  await assert.rejects(normalizeEbayReviewImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"></svg>')), /JPEG, PNG or WebP/);
  const large = await sharp({ create: { width: 3000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } }).png().toBuffer();
  const normalized = await normalizeEbayReviewImage(large);
  const photo = await sharp(normalized).metadata();
  assert.equal(photo.format, "jpeg"); assert.equal(photo.width, 2400); assert.equal(photo.height, 800);
  console.log("eBay layout, image upload and batch regression tests passed.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
