import assert from "node:assert/strict";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import puppeteer from "puppeteer";
import { buildEbayHtmlDescription } from "../lib/ebay-description";
import { buildEbayStaticDescription } from "../lib/marketplace/ebay-description-html";

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "ebay-layout-"));
  const description = buildEbayStaticDescription(buildEbayHtmlDescription({ itemName: "Cubic Zirconia Sapphire Blue", sku: "LAYOUT-PREVIEW", category: "Loose Gemstone", gemType: "Cubic Zirconia", color: "Blue", shape: "Oval", weightValue: 13, weightUnit: "cts", dimensionsMm: "14 x 10 mm", notes: "Preview fixture for layout verification.", mediaUrls: ["https://example.test/gem.jpg"] }, { includeCertificate: false }));
  await writeFile(join(directory, "description.html"), description);
  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    // Deterministic stand-in pictures exercise layout without external fetches.
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.resourceType() === "image") void request.respond({ status: 200, contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="500"><rect width="1000" height="500" fill="#181B4E"/><text x="50" y="260" font-size="50" fill="white">Product photo / brand banner</text></svg>' });
      else void request.abort();
    });
    for (const width of [1100, 390]) {
      await page.setViewport({ width, height: 1000 });
      await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${description}</body></html>`, { waitUntil: "domcontentloaded" });
      await page.evaluate(async () => { await Promise.all(Array.from(document.images).map((photo) => photo.decode().catch(() => {}))); });
      const measurements = await page.evaluate(() => ({ viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, background: getComputedStyle(document.querySelector("h3")!.parentElement!).backgroundColor, photos: document.querySelectorAll("img").length }));
      assert.ok(measurements.scrollWidth <= measurements.viewport + 1, `Horizontal overflow at ${width}px: ${measurements.scrollWidth}`);
      assert.ok(measurements.photos > 0);
      await page.screenshot({ path: join(directory, `preview-${width}.png`), fullPage: true });
      console.log(JSON.stringify({ width, ...measurements, screenshot: join(directory, `preview-${width}.png`) }));
    }
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
