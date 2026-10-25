import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const logoUrl = `data:image/png;base64,${(await readFile("public/brand/khyatigems-logo.png")).toString("base64")}`;
const fixture = {
  serial: "KG-GM-2610-000001-A7F2", sku: "KGLGEMDGRN60000297", gemstoneName: "Zambian Emerald Lab Grown",
  stoneType: "Emerald", condition: "New", weightCarat: 6, weightGrams: 1.2, treatment: "None", mrp: 3300,
  hsn: "7103", originCountry: "Zambia", brandName: "KhyatiGems", logoUrl, packingDate: "2026-10-25T00:00:00+05:30",
};
const result = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {PackagingPrintDialog} from './components/packaging/packaging-print-dialog'; const ids=['fixture']; createRoot(document.getElementById('root')).render(<PackagingPrintDialog open={true} onOpenChange={()=>{}} inventoryIds={ids} initialMedium="THERMAL_50X25" />);`, resolveDir: process.cwd(), loader: "tsx" },
  bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
  plugins: [{ name: "fixture-actions", setup(builder) {
    builder.onResolve({ filter: /^@\/app\/erp\/packaging\/actions$/ }, () => ({ path: "actions", namespace: "fixture" }));
    builder.onResolve({ filter: /^@\/lib\/erp-feedback$/ }, () => ({ path: "feedback", namespace: "fixture" }));
    builder.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: path === "feedback" ? `export const toast={error:console.error,success:()=>{}};` : `const label=${JSON.stringify(fixture)}; export const getPackagingSettings=async()=>({success:true,data:{brandName:label.brandName,logoUrl:label.logoUrl}}); export const getDefaultPackagingLayoutPreset=async()=>({success:true,data:null}); export const getPackagingLayoutPresets=async()=>({success:true,data:[]}); export const previewPackagingIdentities=async(ids,date)=>[{...label,packingDate:date}]; export const processPackagingPrint=async(ids,bypass,options)=>{window.__printOptions=options;return {success:true,labels:[label],thermalReceipt:{cart:[],jobs:[]}}};export const completePackagingThermalPrint=async()=>{};` }));
  } }],
});
const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(result.outputFiles[0].contents); }
  else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css.css); }
  else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html class="dark"><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script>window.open=()=>({location:{set href(url){window.__printed=url}},close(){}})</script><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors=[]; page.on("pageerror", error=>errors.push(error.message));
  await page.setViewport({ width: 1275, height: 858 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  const ready = () => page.waitForFunction(() => { const button=document.querySelector('[data-testid="packaging-print-footer"] button:last-child');return button && !button.disabled; });
  await ready();
  const checkFooter = async () => {
    const box = await page.$eval('[data-testid="packaging-print-footer"]', el => { const r=el.getBoundingClientRect();const dialog=el.closest('[role="dialog"]').getBoundingClientRect();const button=el.querySelector('button:last-child');const b=button.getBoundingClientRect();return { top:r.top,bottom:r.bottom,screen:innerHeight,dialogBottom:dialog.bottom,clickable:button===document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)||button.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2)) }; });
    assert(box.top>=0 && box.bottom<=box.screen && box.bottom<=box.dialogBottom && box.clickable, JSON.stringify(box));
  };
  await checkFooter();
  await mkdir("tmp/pdfs", { recursive:true });
  await page.screenshot({ path:"tmp/pdfs/packaging-dialog-desktop.png" });
  const before = await page.$eval('svg[aria-label="Thermal packaging identity preview"] [data-field="sku"]', el=>Number(el.getAttribute('y')));
  await page.click('[role="checkbox"][aria-label="Weight & quantity"]'); await ready();
  assert.equal(await page.$('svg [data-field="weight"]'), null);
  const after = await page.$eval('svg[aria-label="Thermal packaging identity preview"] [data-field="sku"]', el=>Number(el.getAttribute('y')));
  assert(after<before, "Remaining rows should move up");
  await page.click('[role="checkbox"][aria-label="Verification QR"]'); await ready();
  assert.equal(await page.$('svg [data-field="qr"]'), null);
  assert.equal((await page.$$('svg [data-field="name"]')).length, 1, "Removing QR frees full width");
  await page.click('[role="checkbox"][aria-label="Mfg date"]'); await ready();
  assert.equal(await page.$('svg [data-field="manufacturingDate"]'), null);
  await page.setViewport({ width:390,height:700 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.waitForFunction(() => document.querySelector('[role="dialog"]').getBoundingClientRect().bottom <= innerHeight);
  await page.screenshot({ path:"tmp/pdfs/packaging-dialog-mobile.png" });
  await page.$eval('svg[aria-label="Thermal packaging identity preview"]', el => el.scrollIntoView({ block: "center" }));
  assert(await page.$eval('svg[aria-label="Thermal packaging identity preview"]',el => {const r=el.getBoundingClientRect();return r.bottom>0 && r.top<innerHeight;}), "Mobile preview must remain reachable by scrolling");
  await checkFooter();
  await page.click('[data-testid="packaging-print-footer"] button:last-child');
  await page.waitForFunction(()=>window.__printed);
  const print = await page.evaluate(async()=>({options:window.__printOptions,pdf:(await (await fetch(window.__printed)).text()).slice(0,5)}));
  assert.equal(print.options.printMedium,"THERMAL_50X25");
  assert(!print.options.thermalFields.includes("weight") && !print.options.thermalFields.includes("qr") && !print.options.thermalFields.includes("manufacturingDate"));
  assert.equal(print.pdf,"%PDF-");
  assert.deepEqual(errors,[]);
  console.log("packaging-print-dialog.ui.mjs passed: desktop/mobile Print visible, field toggles reflow preview, selected fields reach print PDF");
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
