import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const root = process.cwd(), out = resolve(root, "tmp/work-tracker-review");
await mkdir(out, { recursive: true });
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from './app/(dashboard)/work-tracker/page'; import {AutomaticWorkTracker} from './components/work-tracker/automatic-tracker'; import {ErpConfirmationProvider} from './components/providers/erp-confirmation-provider'; createRoot(document.getElementById('app')).render(<ErpConfirmationProvider><AutomaticWorkTracker userId="fixture"><Page/></AutomaticWorkTracker></ErpConfirmationProvider>);`, resolveDir: root, loader: "tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, logLevel: "silent",
  plugins: [{ name: "navigation-fixture", setup(builder) {
    builder.onResolve({ filter: /^next\/navigation$/ }, args => ({ path: args.path, namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: 'export const usePathname=()=>"/work-tracker"; export const useSearchParams=()=>new URLSearchParams();', loader: "js" }));
  } }],
});
const styles = await postcss([tailwind()]).process(await readFile(resolve(root, "app/globals.css"), "utf8"), { from: resolve(root, "app/globals.css") });
const css = styles.css + await readFile(resolve(root, "app/workspace-theme.css"), "utf8");
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
let slowEbay = false;
const requests = [], writes = [];
function dashboard(url) {
  const platform = url.searchParams.get("platform") || "ERP", seconds = platform === "ETSY" ? 180 : platform === "EBAY" ? 120 : 60;
  const summary = { totalSeconds: seconds, openLegacyTimers: 1, today: { [platform]: seconds }, byPlatform: { [platform]: seconds }, daily: { [today]: { [platform]: seconds } }, weekly: {}, targets: [] };
  const base = { revision: 0, platform, activityType: "OTHER", description: "Preserved activity", sku: null, marketplaceListingId: null, status: "COMPLETED", startedAt: new Date(Date.now() - 600000).toISOString(), endedAt: new Date(Date.now() - 540000).toISOString(), durationSeconds: 60, notes: null };
  return { summary, live: summary, metrics: { platforms: ["ERP", "EBAY", "ETSY", "AMAZON"].map(p => ({ platform: p, publishedListings: p === "EBAY" ? 1 : null, averageMinutesPerListing: null, listingsPerHour: null, eligibleMinutes: 0, preparationMinutes: 0, publishingMinutes: 0, synchronizationMinutes: 0, coverage: "Fixture publication coverage" })), definition: "Fixture calculation" }, activityGroups: [{ day: today, platform, activityType: "OTHER", seconds, intervalCount: 3 }], entries: [{ ...base, id: "old-manual", effectiveSeconds: 0, trackingSource: "MANUAL" }, { ...base, id: "automatic", effectiveSeconds: seconds, trackingSource: "AUTOMATIC" }], entryPage: Number(url.searchParams.get("entryPage") || 0), entryPageSize: 15, totalEntries: 31, byActivity: { OTHER: seconds }, bySource: { AUTOMATIC: seconds }, credentials: [], revenue: { available: false, reason: "No connected shop in isolated fixture" }, extensionLastSync: null };
}
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://fixture.local");
  if (url.pathname === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (url.pathname === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else if (/^\/marketplaces\/(ebay|etsy|amazon)\.svg$/.test(url.pathname)) { res.setHeader("Content-Type", "image/svg+xml"); res.end(await readFile(resolve(root, `public${url.pathname}`))); }
  else if (url.pathname === "/api/work-tracker/dashboard") {
    requests.push(url); const result = dashboard(url);
    if (slowEbay && url.searchParams.get("platform") === "EBAY") await new Promise(done => setTimeout(done, 300));
    res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(result));
  } else if (url.pathname.startsWith("/api/work-tracker/")) {
    let body = ""; for await (const part of req) body += part;
    writes.push({ method: req.method, path: url.pathname, body: body ? JSON.parse(body) : null });
    if (req.method === "PATCH") await new Promise(done => setTimeout(done, 250));
    res.setHeader("Content-Type", "application/json"); res.end("{}");
  } else {
    res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="padding:16px;font-family:Arial"><div id="app"></div><script src="/bundle.js"></script></body></html>');
  }
});
await new Promise(done => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.body.innerText.includes("Previous manual timers are retained"));
  const button = async text => { await page.evaluate(label => [...document.querySelectorAll("button")].find(element => element.textContent === label)?.click(), text); };
  assert.doesNotMatch(await page.$eval("body", e => e.innerText), /Close previous timer|Start timer|Add manual|Delete interval/);
  await button("Inspect / correct intervals");
  assert.match(await page.$eval("body", e => e.innerText), /Legacy manual/);
  await button("Next intervals"); await page.waitForFunction(() => document.body.innerText.includes("2 / 3"));
  slowEbay = true;
  const ebayRequest = page.waitForRequest(request => request.url().includes("platform=EBAY"));
  await page.select("label:nth-child(3) select", "EBAY");
  await ebayRequest;
  await page.select("label:nth-child(3) select", "ETSY");
  await page.waitForFunction(() => document.body.innerText.includes("0h 3m"));
  await page.waitForNetworkIdle();
  assert.match(await page.$eval("body", e => e.innerText), /0h 3m/, "a slow previous filter cannot overwrite the latest report");
  assert.equal(requests.at(-1).searchParams.get("entryPage"), "0", "filters reset the server detail page");
  await button("Inspect / correct intervals");
  await page.evaluate(() => [...document.querySelectorAll("button")].find(element => element.textContent === "Correct").click());
  assert.doesNotMatch(await page.$eval("body", e => e.innerText), /Delete interval/);
  const correctionRequest = page.waitForRequest(request => request.method() === "PATCH");
  await button("Save correction");
  await correctionRequest;
  await page.select("label:nth-child(3) select", "EBAY");
  await page.waitForFunction(() => !document.body.innerText.includes("Correct recorded activity"));
  await page.waitForNetworkIdle();
  assert.match(await page.$eval("body", e => e.innerText), /0h 2m/, "correction completion reloads the current filters");
  assert.equal(writes.at(-1).method, "PATCH"); assert.equal("startedAt" in writes.at(-1).body, false);
  const refreshed = page.waitForRequest(request => request.url().includes("/dashboard?"));
  await page.evaluate(() => window.dispatchEvent(new Event("khyati:work-synced")));
  await refreshed; await page.waitForNetworkIdle();
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    await page.waitForNetworkIdle({ idleTime: 1800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `No horizontal overflow at ${width}`);
    await page.screenshot({ path: resolve(out, `work-tracker-${width}.png`), fullPage: true });
  }
  await button("Listing productivity");
  assert.match(await page.$eval("body", e => e.innerText), /Linked time used for rates/);
  await button("Time targets");
  const targetSaved = page.waitForRequest(request => request.method() === "PUT");
  await button("Save target"); await targetSaved; await page.waitForNetworkIdle();
  assert.equal(writes.find(write => write.method === "PUT").body.targetMinutes, 120);
  await button("Connections");
  assert.match(await page.$eval("body", e => e.innerText), /This Chrome browser/);
  await button("Work summary");
  const beforeDay = await page.$eval('input[aria-label="Report through date"]', input => input.value);
  await page.evaluate(() => { const realNow = Date.now(); Date.now = () => realNow + 86400000; window.dispatchEvent(new Event("focus")); });
  await page.waitForFunction(day => document.querySelector('input[aria-label="Report through date"]').value !== day, beforeDay);
  await page.$eval('input[aria-label="Report from date"]', input => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ""); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await page.waitForSelector('[role="alert"]');
  assert.deepEqual(errors, []);
  assert.equal(writes.some(write => write.method === "DELETE" || /sessions\/start/.test(write.path)), false);
  console.log(`Work Tracker UI passed: actual page/provider, retained legacy history, filter pagination, safe corrections, sync refresh, empty dates and responsive layout. Screenshots: ${out}`);
} finally { await browser?.close(); await new Promise(done => server.close(done)); }
