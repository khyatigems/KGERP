import assert from "node:assert/strict";
import { readFile, mkdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve, sep } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const root = process.cwd();
const out = resolve(root, "tmp/companion-assets-review/ui");
await mkdir(out, { recursive: true });
const bundle = await build({ stdin: { contents: `
import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
import {CompanionHost} from './components/companion/companion-host';
import {OfficialCompanionAvatar} from './components/companion/official-avatar';
import {companionDefaults} from './lib/companion';import {operationFeedback,toast,Toaster} from './lib/erp-feedback';
import {InventorySaveProgressToast} from './components/inventory/inventory-save-progress-toast';
window.inventoryOperation=evidence=>operationFeedback('inventory.update.'+(evidence==='started'?'started':evidence==='success'?'completed':'failed'),evidence,()=> <InventorySaveProgressToast itemName="Browser fixture" completeness={{passed:0,total:0,score:0,fields:[]}} status={evidence==='started'?'saving':evidence==='success'?'success':'error'} isUpdate/>,{id:'inventory-save-progress',duration:Infinity});
window.unknownCustom=()=>toast.custom(()=> <div>Native custom fallback fixture</div>,{id:'native-custom-fixture',duration:Infinity});
import {publishCompanionNotifications} from './lib/companion-notification-store';
window.erpToast=toast;window.setNotices=items=>publishCompanionNotifications(items,'ready');
window.reviewWrites=[];window.fetch=async (url,options)=>{if(options?.method==='PATCH'){window.reviewWrites.push(JSON.parse(options.body));return {ok:true,json:async()=>({})}}if(String(url).startsWith('/api/companion/attention'))return new Promise(resolve=>{window.finishAttention=()=>resolve({ok:true,json:async()=>({cards:[],unavailable:[]})})});return {ok:true,json:async()=>({items:[],hasMore:false,unreadCount:0,canRetryMarketplaceSync:false})}};
function App(){const [prefs,setPrefs]=useState({...companionDefaults,enabled:true,greetings:false,notifications:false,size:144});window.setAvatarPreferences=patch=>setPrefs(current=>({...current,...patch}));
return <><Toaster/><main className="p-8"><h1 className="text-2xl font-semibold">KhyatiGems Companion</h1><p className="mt-2 text-sm text-muted-foreground">Official supplied character library</p><div id="failure-fixture" style={{position:'absolute',left:-500,width:96,height:96}}><OfficialCompanionAvatar state="thinking"/></div></main><CompanionHost initialPreferences={prefs} allowedModules={['ALL']} userId="avatar-review"/></>}
createRoot(document.getElementById('app')).render(<App/>);
`, resolveDir: root, loader: "tsx" }, bundle: true, write: false, outdir: out, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, logLevel: "silent", plugins: [{ name: "isolated-erp", setup(b) {
  b.onResolve({ filter: /^next\/(navigation|link|dynamic)$/ }, a => ({ path: a.path, namespace: "stub" }));
  b.onResolve({ filter: /settings\/companion\/actions$/ }, a => ({ path: a.path, namespace: "stub" }));
  b.onLoad({ filter: /.*/, namespace: "stub" }, a => ({ resolveDir: root, loader: "tsx", contents: a.path === "next/navigation" ? "export const usePathname=()=>'/inventory';" : a.path === "next/link" ? "import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}" : a.path === "next/dynamic" ? "import React from 'react';export default function dynamic(load){const C=React.lazy(()=>load().then(value=>({default:value.default||value})));return props=><React.Suspense fallback={null}><C {...props}/></React.Suspense>}" : "export async function saveCompanionPreferences(preferences){window.savedAvatarPreferences=preferences;return {preferences}}" }));
} }] });
const sourceCss = (await readFile(resolve(root, "app/globals.css"), "utf8")).replace('@import "tailwindcss";', '@import "tailwindcss" source(none); @source "../components/companion"; @source "../components/ui";');
const baseCss = (await postcss([tailwind()]).process(sourceCss, { from: resolve(root, "app/globals.css") })).css + "\n" + await readFile(resolve(root, "app/workspace-theme.css"), "utf8") + "\n" + bundle.outputFiles.filter(file => file.path.endsWith(".css")).map(file => file.text).join("\n");
const css = baseCss + "\n" + await readFile(resolve(root, "components/ui/rich-feedback.css"), "utf8");
const js = bundle.outputFiles.find(file => file.path.endsWith(".js")).text;
const publicRoot = resolve(root, "public");
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname;
    if (pathname === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(js); }
    else if (pathname === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
    else if (pathname.startsWith("/companion/")) {
      const filename = resolve(publicRoot, "." + pathname);
      if (!filename.startsWith(publicRoot + sep)) { res.writeHead(403).end(); return; }
      res.setHeader("Content-Type", filename.endsWith(".mp4") ? "video/mp4" : "image/webp");
      res.setHeader("Content-Length", (await stat(filename)).size); res.end(await readFile(filename));
    } else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>'); }
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await puppeteer.launch({ headless: true, protocolTimeout: 30000, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.complete && document.querySelector('[data-companion-launcher] img')?.naturalWidth > 0);
  assert.equal(await page.$eval('[data-companion-launcher] img', el => el.dataset.pose), "idle");
  await page.hover('[data-companion-launcher]');
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.equal(await page.$eval('[data-companion-launcher] img', el => el.dataset.pose), "idle", "hover must not change the pose");
  assert.equal(await page.$('[aria-label="Move Khyra"]'), null, "no separate drag holder");
  await page.mouse.move(20, 250);
  await page.evaluate(() => window.erpToast.loading("Processing fixture", { id: "avatar-operation" }));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === "working");
  await page.evaluate(() => window.erpToast.success("Verified fixture completed", { id: "avatar-operation" }));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === "success");
  await page.evaluate(() => window.setAvatarPreferences({ notifications: true }));
  await page.waitForSelector(".khyra-speech");
  await page.screenshot({ path: resolve(out, "khyra-speech-bubble.png"), captureBeyondViewport: false });
  await page.click('[aria-label="Dismiss companion alert"]');
  await page.evaluate(() => window.erpToast.error('Delivery retry fixture', { id: 'delivery-retry-fixture' }));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === 'concerned');
  await page.waitForFunction(() => document.querySelector('.khyra-speech')?.textContent.includes('Delivery retry fixture'), { timeout: 33000 });
  assert.ok(await page.$('.khyra-speech'), 'a cooldown-deferred event must eventually produce a visible bubble');
  await page.evaluate(() => window.setAvatarPreferences({ notifications: false }));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('Delivery retry fixture')), { timeout: 5000 });
  await page.evaluate(() => window.erpToast.success('Reset pose fixture', { id: 'avatar-operation' }));
  await page.evaluate(() => window.setAvatarPreferences({ framing: "full-body", poseMode: "framed" }));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === "success");
  await page.evaluate(() => window.setAvatarPreferences({ quiet: true }));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === "idle");
  await page.screenshot({ path: resolve(out, "rest-full-body.png"), captureBeyondViewport: false });
  await page.evaluate(() => window.setAvatarPreferences({ quiet: false, framing: "portrait", poseMode: "framed" }));
  await page.click("[data-companion-launcher]");
  const clickSection = text => page.evaluate(text => { const button = [...document.querySelectorAll('[aria-label="Khyra ERP companion"] button')].find(button => button.textContent.trim() === text); if (!button) throw new Error(`Missing ${text}`); button.click(); }, text);
  await clickSection("Style");
  await page.waitForSelector('[aria-label="Official companion pose library"]');
  await page.evaluate(() => { const checkbox = [...document.querySelectorAll('label')].find(el => el.textContent.includes('Flip Khyra horizontally'))?.querySelector('input'); if (!checkbox) throw new Error('Missing flip setting'); checkbox.click(); });
  await page.evaluate(() => [...document.querySelectorAll('button')].find(el => el.textContent === 'Apply companion').click());
  await page.waitForFunction(() => window.savedAvatarPreferences?.flipped === true && getComputedStyle(document.querySelector('[data-companion-launcher] > span')).transform.includes('-1'));
  assert.equal(await page.$$eval('[aria-label="Official companion pose library"] button[aria-label^="Preview "]', els => els.length), 4);
  for (const label of ["Relaxed", "Concerned", "Success", "Working at laptop"]) {
    await page.$eval(`[aria-label="Preview ${label}"]`, button => button.scrollIntoView({ block: "center" }));
    await page.click(`[aria-label="Preview ${label}"]`);
    await page.waitForFunction(label => [...document.querySelectorAll('[role="status"]')].some(el => el.textContent === `Preview: ${label}`), {}, label);
    const previewPose = await page.$eval(`[aria-label="Preview ${label}"] img`, image => image.dataset.pose);
    assert.equal(await page.$eval('[data-companion-launcher] img', image => image.dataset.pose), previewPose);
  }
  await page.screenshot({ path: resolve(out, "pose-library.png"), captureBeyondViewport: false });
  if (!await page.$('[aria-label="Khyra ERP companion"]')) await page.click("[data-companion-launcher]");
  await clickSection("Workday");
  await page.waitForFunction(() => document.querySelector('[data-companion-state]')?.dataset.companionState === "thinking");
  await page.waitForSelector("video");
  await page.waitForFunction(() => { const v = document.querySelector("video"); return v && !v.paused && v.currentTime > .1; });
  assert.equal(await page.$eval("video", video => video.muted && video.playsInline), true);
  await page.screenshot({ path: resolve(out, "thinking-workday.png"), captureBeyondViewport: false });
  await page.$eval('[aria-label="Khyra ERP companion"]', panel => { panel.scrollTop = panel.scrollHeight; });
  await page.waitForSelector("video", { hidden: true });
  await page.$eval(".facet-thinking-review", card => card.scrollIntoView({ block: "center" }));
  await page.waitForSelector("video");
  await page.evaluate(() => window.setAvatarPreferences({ animations: false }));
  await page.waitForSelector("video", { hidden: true });
  await page.evaluate(() => window.setAvatarPreferences({ animations: true }));
  await page.waitForSelector("video");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.waitForSelector("video", { hidden: true });
  assert.ok(await page.$('[data-thinking-active="false"] img'), "reduced motion retains a static poster");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.waitForSelector("video");
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForSelector("video", { hidden: true });
  await page.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" }); document.dispatchEvent(new Event("visibilitychange")); });
  await page.waitForSelector("video");
  await page.$eval("video", video => video.dispatchEvent(new Event("error")));
  await page.waitForSelector("video", { hidden: true });
  assert.ok(await page.$('[data-thinking-active="false"] img'), "video errors keep the static poster");
  await page.evaluate(() => window.finishAttention());
  await page.waitForSelector("video", { hidden: true });
  await page.waitForFunction(() => document.querySelector('[data-companion-state]')?.dataset.companionState !== "thinking");
  await page.keyboard.press("Escape");
  const launcher = await page.$('[data-companion-launcher]');
  const bounds = await launcher.boundingBox();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(1100, 899, { steps: 12 });
  await page.mouse.up();
  const bottomBounds = await launcher.boundingBox();
  assert.ok(900 - bottomBounds.y - bottomBounds.height <= 5, 'Khyra can reach the bottom edge');
  assert.equal(await page.$('[aria-label="Khyra ERP companion"]'), null, 'dragging does not open tools');
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForSelector("[data-companion-launcher]", { hidden: true });
  await page.setViewport({ width: 1280, height: 900 });
  await page.waitForSelector("[data-companion-launcher]");
  await page.evaluate(() => { localStorage.removeItem('facet:interruptions:avatar-review'); window.setAvatarPreferences({ notifications: true }); });
  await page.evaluate(() => window.unknownCustom());
  await page.waitForFunction(() => [...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('Native custom fallback fixture') && getComputedStyle(el).display !== 'none'));
  await page.evaluate(() => window.erpToast.dismiss('native-custom-fixture'));
  await page.evaluate(() => window.inventoryOperation('started'));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === 'working' && !!document.querySelector('.khyra-speech'));
  assert.ok(await page.$eval('.khyra-speech', el => /updat|sav/i.test(el.textContent)), 'custom inventory progress has a real visible message');
  await page.evaluate(() => window.inventoryOperation('success'));
  await page.waitForFunction(() => document.querySelector('[data-companion-launcher] img')?.dataset.pose === 'success' && /updat/i.test(document.querySelector('.khyra-speech')?.textContent || ''));
  await new Promise(resolve => setTimeout(resolve, 350));
  await page.screenshot({ path: resolve(out, 'inventory-update-bubble.png'), captureBeyondViewport: false });
  await page.click('[data-companion-launcher]');
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Khyra ERP companion"] button')].find(button => button.textContent.trim().startsWith('Activity')).click());
  assert.equal(await page.$('[aria-label="Khyra ERP companion"] [aria-label="Quick actions"]'), null, 'Activity focuses on updates rather than shortcuts');
  await page.waitForSelector('.facet-feedback[data-feedback-id="inventory-save-progress"]');
  await page.waitForFunction(() => ![...document.querySelectorAll('[data-sonner-toast]')].some(el => el.textContent.includes('Inventory updated') && getComputedStyle(el).display !== 'none'));
  const panelCardBounds = await page.$eval('.facet-feedback[data-feedback-id="inventory-save-progress"]', card => {
    const panel = card.closest('[aria-label="Khyra ERP companion"]'); const c = card.getBoundingClientRect(); const p = panel.getBoundingClientRect(); return c.left >= p.left && c.right <= p.right;
  });
  assert.ok(panelCardBounds, 'inventory activity must fit inside the companion panel');
  await page.$eval('.facet-feedback[data-feedback-id="inventory-save-progress"] > details', details => { details.open = true; details.scrollIntoView({block:'center'}); });
  assert.ok(await page.$eval('.facet-feedback[data-feedback-id="inventory-save-progress"] .erp-feedback-card', card => card.getBoundingClientRect().width <= card.closest('.facet-feedback').getBoundingClientRect().width), 'expanded original card stays within Activity');
  await page.$eval('.facet-feedback[data-feedback-id="inventory-save-progress"] > details', details => { details.open = false; details.closest('article').scrollIntoView({block:'center'}); });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: resolve(out, 'inventory-activity-panel.png'), captureBeyondViewport: false });
  await page.waitForFunction(() => document.querySelector('.facet-feedback[data-feedback-id="inventory-save-progress"]')?.textContent.includes('Read'), { timeout: 8000 });
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable:true,get:()=> 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); window.inventoryOperation('started'); window.inventoryOperation('success'); });
  await new Promise(resolve => setTimeout(resolve, 7000));
  assert.ok(await page.$eval('.facet-feedback[data-feedback-id="inventory-save-progress"]', card => card.textContent.includes('New')), 'updates received while away remain unread');
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable:true,get:()=> 'visible'}); document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  await page.waitForFunction(() => document.querySelector('.facet-feedback[data-feedback-id="inventory-save-progress"]')?.textContent.includes('Read'), { timeout: 8000 });
  const purplePanel = await page.$eval('[aria-label="Khyra ERP companion"]', panel => getComputedStyle(panel).getPropertyValue('--popover').trim());
  assert.equal(purplePanel, '#382443', 'companion panel keeps its own purple theme');
  await page.keyboard.press('Escape');
  await page.evaluate(() => { localStorage.removeItem('facet:interruptions:avatar-review'); window.setNotices([{id:'auto-read-saved',eventKey:'inventory-created:auto-read-saved',type:'success',title:'Saved notification fixture',message:'Verified fixture',href:null,createdAt:new Date().toISOString(),readAt:null}]); });
  await page.waitForFunction(() => document.querySelector('.khyra-speech')?.textContent.includes('Saved notification fixture'));
  await page.waitForFunction(() => window.reviewWrites.some(write => write.id === 'auto-read-saved' && write.action === 'read'), {timeout:8000});
  assert.ok(await page.evaluate(() => window.reviewWrites.every(write => write.action !== 'acknowledge')), 'automatic reading must never acknowledge operational issues');

  // Actual media failures must fall back to the same character's master, then branding.
  await page.$eval("#failure-fixture img", el => el.dispatchEvent(new Event("error")));
  await page.waitForFunction(() => document.querySelector('#failure-fixture img')?.dataset.pose === "idle");
  await page.$eval("#failure-fixture img", el => el.dispatchEvent(new Event("error")));
  await page.waitForSelector('[aria-label="Khyra image unavailable"]');
  assert.deepEqual(errors, []);
  console.log("Official Companion UI passed: inventory custom-card progress/completion bubbles and poses, visible unknown-card fallback, cooldown retry, four event poses, unchanged hover, saved flip, direct bottom-edge dragging, thinking MP4 controls and mobile/image fallbacks.");
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
