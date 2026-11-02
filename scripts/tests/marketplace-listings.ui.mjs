import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const root = process.cwd();
const out = resolve(root, "tmp/marketplace-listings-review");
await mkdir(out, { recursive: true });
const mocks = {
  "next/link": 'export default function Link({children,...props}) { return <a {...props}>{children}</a> }',
  "next/navigation": 'export const redirect = (url) => { throw new Error(url) }',
  "@/lib/permission-guard": 'export const checkPermission = async () => ({success:true})',
  "@/lib/permissions": 'export const PERMISSIONS = {LISTINGS_VIEW:"view"}',
  "@/lib/marketplace-foundation": 'export const ensureMarketplaceFoundationSchema = async () => {}',
  "@/components/marketplace/sync-panel": 'export const MarketplaceSyncPanel = () => <button>Sync listings</button>',
  "@/components/marketplace/marketplace-listings-export": 'export const MarketplaceListingsExport = ({rows}) => {window.exportRows=rows; return <button>Export Excel</button>}',
  "@/components/layout/workspace-header": 'export const WorkspaceHeader = ({children}) => <header>{children}</header>',
  "@/lib/prisma": `
    const now = new Date('2026-11-02T06:00:00Z');
    const rows = [
      {id:'ebay',platform:'EBAY',externalId:'366733177174',marketplaceShopId:'shop',marketplaceShop:{name:'khyatigemsOfficial'},marketplaceTitle:'Natural Alexandrite 13 Ct Cushion, Color Change Brazil GCI Certified Loose Gem',listingSku:'KGALXCLR130000276',inventory:{sku:'KGALXCLR130000276',itemName:'Brazilian Alexandrite Color Change',imageUrl:'/gem.svg',media:[]},marketplacePrice:51.4,currency:'USD',marketplaceQuantity:1,marketplaceViews:176,marketplaceFavorites:12,marketplaceOrders:2,status:'ACTIVE',syncStatus:'SYNCED',syncError:null,lastSyncedAt:now,createdAt:now,listingUrl:'https://example.com/listing',priceHistory:[{price:51.4,currency:'USD',changedAt:now},{price:65,currency:'USD',changedAt:new Date('2026-10-21T06:00:00Z')}],rawMetadata:JSON.stringify({_listing:{images:['/broken.jpg'],category:'Loose Gemstones',listingType:'FixedPriceItem',viewsPeriod:'2026-10-03 – 2026-11-01 (UTC)',metricsUpdatedAt:now.toISOString(),impressions:1200}})},
      {id:'etsy',platform:'ETSY',externalId:'123456',marketplaceShopId:'shop2',marketplaceShop:{name:'KhyatiGems'},marketplaceTitle:'Natural Ruby Loose Gemstone',listingSku:'RUBY001',inventory:null,marketplacePrice:100,currency:'INR',marketplaceQuantity:2,marketplaceViews:0,marketplaceFavorites:0,marketplaceOrders:null,status:'ACTIVE',syncStatus:'UNKNOWN_SKU',syncError:'SKU not mapped',lastSyncedAt:now,createdAt:now,listingUrl:'https://example.com/etsy',priceHistory:[{price:100,currency:'INR',changedAt:now}],rawMetadata:JSON.stringify({_listing:{images:[],category:'123',viewsPeriod:'Etsy cumulative views (updated daily)',tags:['ruby','gemstone'],hasVariations:true}})}
    ];
    export const prisma = {marketplaceShop:{findMany:async()=>[{id:'shop',marketplace:'EBAY',name:'khyatigemsOfficial',status:'CONNECTED',connection:{status:'CONNECTED'}}]},listing:{count:async()=>rows.length,findMany:async()=>rows},marketplaceSyncJob:{findMany:async()=>[]},$queryRaw:async()=>[{nowMs:now.getTime()}]};
  `,
};
const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import Page from './app/(dashboard)/marketplace-listings/page'; async function run(){ const page=await Page({searchParams:Promise.resolve({})});createRoot(document.getElementById('app')).render(page); } run();`, resolveDir: root, loader: "tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, logLevel: "silent",
  plugins: [{ name: "isolated-listing-data", setup(builder) {
    builder.onResolve({ filter: /.*/ }, (args) => args.path in mocks ? { path: args.path, namespace: "test-mocks" } : undefined);
    builder.onLoad({ filter: /.*/, namespace: "test-mocks" }, (args) => ({ contents: mocks[args.path], loader: "tsx", resolveDir: root }));
  } }],
});
const styles = await postcss([tailwind()]).process(await readFile(resolve(root, "app/globals.css"), "utf8"), { from: resolve(root, "app/globals.css") });
const css = styles.css + await readFile(resolve(root, "app/workspace-theme.css"), "utf8");
let failHistory = false;
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else if (req.url === "/broken.jpg") { res.writeHead(404); res.end(); }
  else if (req.url === "/gem.svg") { res.setHeader("Content-Type", "image/svg+xml"); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/><path d="M20 30L40 15H60L80 30L50 85Z" fill="#923a81" stroke="#44204a" stroke-width="3"/><path d="M20 30H80L50 85L40 15M60 15L50 85" fill="none" stroke="#e4a0d5" stroke-width="2"/></svg>'); }
  else if (req.url?.includes("price-history")) {
    res.setHeader("Content-Type", "application/json");
    if (failHistory) { res.writeHead(500); res.end('{}'); }
    else res.end(JSON.stringify({history:[{id:'a',price:51.4,currency:'USD',changedAt:'2026-11-02T06:00:00Z',changedBy:'EBAY_SYNC'},{id:'b',price:65,currency:'USD',changedAt:'2026-10-21T06:00:00Z',changedBy:'EBAY_SYNC'},{id:'c',price:70,currency:'USD',changedAt:'2026-10-10T06:00:00Z',changedBy:'EBAY_SYNC'},{id:'d',price:75,currency:null,changedAt:'2026-10-01T06:00:00Z',changedBy:'EBAY_SYNC_INITIAL'}]}));
  } else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="padding:24px"><div id="app"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(); const errors = [];
  page.on("pageerror", (error) => { errors.push(error.message); console.error(error.message); });
  await page.setViewport({ width: 1536, height: 1000 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  await page.waitForSelector('img[src$="/gem.svg"]');
  assert.ok((await page.$eval('img[src$="/gem.svg"]', (image) => image.naturalWidth)) > 0, "Broken marketplace image falls back to ERP image");
  const text = await page.$eval("body", (body) => body.innerText);
  assert.match(text, /Previous: USD 65.00/); assert.match(text, /13.60/); assert.match(text, /20.9%/);
  assert.match(text, /Favorites \/ Watchers/); assert.match(text, /Impressions/);
  const exportRows = await page.evaluate(() => window.exportRows);
  assert.equal(exportRows[0].previousPrice, "USD 65"); assert.equal(exportRows[1].views, "0");
  await page.screenshot({ path: resolve(out, "listings-desktop.png"), fullPage: true });
  await page.evaluate(() => { const table = document.querySelector("table"); table.closest("[data-slot='table-container']").scrollLeft = 10000; });
  await page.screenshot({ path: resolve(out, "listing-metrics-desktop.png"), fullPage: true });
  await page.evaluate(() => { const table = document.querySelector("table"); table.closest("[data-slot='table-container']").scrollLeft = 0; });
  await page.click('button:has(svg.lucide-history)');
  await page.waitForSelector('[role="dialog"] tbody tr');
  assert.equal(await page.$$eval('[role="dialog"] tbody tr', (rows) => rows.length), 4, "Full history loads beyond the two table entries");
  assert.match(await page.$eval('[role="dialog"]', (dialog) => dialog.innerText), /Legacy currency assumed/);
  await page.screenshot({ path: resolve(out, "price-history.png"), fullPage: true });
  await page.keyboard.press("Escape"); await page.waitForSelector('[role="dialog"]', { hidden: true });
  failHistory = true; await page.click('button:has(svg.lucide-history)');
  await page.waitForSelector('[role="alert"]');
  failHistory = false;
  await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button')].find((button) => button.textContent === "Retry").click());
  await page.waitForSelector('[role="dialog"] tbody tr');
  await page.keyboard.press("Escape");
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(out, "listings-mobile.png"), fullPage: true });
  await page.click('button:has(svg.lucide-history)');
  await page.waitForSelector('[role="dialog"] tbody tr');
  assert.equal(await page.$eval('[role="dialog"]', (dialog) => { const box = dialog.getBoundingClientRect(); return box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight; }), true, "History dialog fits the mobile viewport");
  await page.screenshot({ path: resolve(out, "price-history-mobile.png"), fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Wide table scrolls inside its container");
  assert.deepEqual(errors, []);
  console.log(`Marketplace listings UI checks passed. Screenshots: ${out}`);
} finally { await browser?.close(); await new Promise((done) => server.close(done)); }
