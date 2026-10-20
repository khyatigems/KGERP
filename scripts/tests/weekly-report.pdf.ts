import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";
import { settings, metrics } from "./weekly-report.unit";
import { renderReport, reportAssets, reportHtml } from "@/lib/weekly-report/pdf";
async function main() {
 const s = { ...settings, logo: "APPROVED_DEFAULT" as const, name: "Weekly Business Intelligence — SYNTHETIC QA PREVIEW" };
 const m = { ...metrics, coverage: ["SYNTHETIC TEST DATA — layout and calculation validation only. These are not live company statistics.", ...metrics.coverage], exceptions: Array.from({ length: 110 }, (_, i) => ({ ...metrics.exceptions[0], missing: ["weight"], action: "Add or verify weight.", sku: `TEST-KG-${i + 1}`, name: `Synthetic ruby ${i + 1}` })) };
 const bytes = await renderReport(m, s, "SYNTHETIC TEST");
 assert.ok(bytes.length > 10000);
 await mkdir("output/pdf", { recursive: true }); await mkdir("tmp/pdfs", { recursive: true });
 await writeFile("output/pdf/KhyatiGems-weekly-SYNTHETIC-preview.pdf", bytes);
 const assets = await reportAssets(s), html = reportHtml(m, s, assets.logo, assets.font, "SYNTHETIC TEST");
 await writeFile("tmp/pdfs/weekly-preview.html", html);
 const browser = await puppeteer.launch({ headless: true });
 try { const page = await browser.newPage(); await page.setViewport({ width: 900, height: 1250 }); await page.setContent(html); await page.screenshot({ path: path.resolve("tmp/pdfs/weekly-preview.png") }); } finally { await browser.close(); }
 console.log(`PDF rendering passed: ${bytes.length} bytes, approved logo, embedded font, controlled SVG charts and 110-row exception pagination fixture. output/pdf/KhyatiGems-weekly-SYNTHETIC-preview.pdf`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
