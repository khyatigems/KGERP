// UI/lifecycle fixtures. Real signatures and server enforcement are covered by
// passkeys.integration.ts with a virtual CTAP2 authenticator and real database.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const bundle = await build({ stdin: { contents: `import React,{useState} from 'react';import{Dialog,DialogContent,DialogTitle,DialogDescription}from'./components/ui/dialog';import{createRoot}from'react-dom/client';import{AppLockProvider}from'./components/auth/app-lock-provider';import{AppLockSettings}from'./components/settings/app-lock-settings';function Workspace(){const[open,setOpen]=useState(false);return <AppLockProvider><h1 id="secret">Private ERP workspace</h1><AppLockSettings/><button onClick={()=>setOpen(true)}>Open private modal</button><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Private customer details</DialogTitle><DialogDescription>Private modal fixture</DialogDescription><button onClick={()=>setOpen(false)}>Close private modal</button></DialogContent></Dialog></AppLockProvider>}createRoot(document.getElementById('app')).render(<Workspace/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fixtures", setup(builder) {
  builder.onResolve({ filter: /^(next\/navigation|next-auth\/react|erp-webauthn-browser)$/ }, args => ({ path: args.path, namespace: "fixtures" }));
  builder.onLoad({ filter: /.*/, namespace: "fixtures" }, args => ({ resolveDir: process.cwd(), contents: args.path === "next/navigation" ? `export const usePathname=()=>location.pathname;` : args.path === "next-auth/react" ? `import{useState}from'react';export const useSession=()=>{const[status,setStatus]=useState('authenticated');window.__setAuthStatus=setStatus;return{status,data:{user:{id:'fixture-user'}}}};export const signOut=async()=>{window.__signedOut=true};` : `export async function startAuthentication(){window.__verificationCalls=(window.__verificationCalls||0)+1;if(window.__cancel)throw new DOMException('Cancelled','NotAllowedError');window.dispatchEvent(new Event('blur'));return{id:'fixture-key'}}` }));
} }] });
const css = (await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" })).css;
let state = { enabled: false, locked: false, supported: true, hasPasskeys: true }, entry = false, navigate = false, apiCalls = 0, deviceSelections = [];
const server = createServer(async (req, res) => {
  const path = new URL(req.url, "http://fixture.test").pathname;
  if (path === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
  if (path === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); return; }
  if (path === "/api/private") { apiCalls++; res.statusCode = state.locked ? 423 : 200; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify({ private: !state.locked })); return; }
  if (path === "/api/auth/app-lock") {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.end(JSON.stringify(state)); return; }
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw);
    if (body.action === "options") { navigate = body.navigate; deviceSelections.push(body.credentialId); }
    if (body.action === "verify") { state = { ...state, enabled: true, locked: false }; entry = navigate; }
    if (body.action === "lock") { state.locked = true; entry = false; }
    if (body.action === "disable") { state.enabled = false; state.locked = false; }
    if (body.action === "heartbeat" && state.locked) res.statusCode = 423;
    res.end(JSON.stringify(body.action === "options" ? {} : state)); return;
  }
  if (state.enabled && path !== "/unlock" && path !== "/login") {
    if (entry) entry = false;
    else { state.locked = true; res.writeHead(307, { Location: "/unlock?next=%2F" }); res.end(); return; }
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  await mkdir("tmp/app-lock-ui", { recursive: true });
  browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();
  const errors = [];
  const url = `http://127.0.0.1:${server.address().port}`;
  const attach = () => page.on("pageerror", error => errors.push(error.message)); attach();
  const click = text => page.locator(`::-p-text(${text})`).click();
  for (const width of [320, 390, 1440]) {
    state = { enabled: false, locked: false, supported: true, hasPasskeys: true }; entry = false;
    await page.setViewport({ width, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("#secret", { visible: true });
    await page.evaluate(() => localStorage.setItem('erp-app-unlock-device:fixture-user', 'fixture-key'));
    await click("Enable fingerprint app lock");
    await page.waitForFunction(() => document.body.innerText.includes("App lock is on"));
    assert.equal(await page.evaluate(async () => (await fetch('/api/private')).status), 200);
    // The fixture generates blur while the native prompt is active. This must
    // not lock the newly verified app or turn the prompt into a retry loop.
    assert.equal(await page.$('[aria-label="ERP app lock"]'), null);
    await click("Open private modal");
    const background = await browser.newPage();
    await background.bringToFront();
    await page.waitForSelector('[aria-label="ERP app lock"]');
    await page.bringToFront();
    assert.equal(await page.$eval('#secret', element => Boolean(element.closest('[hidden]'))), true, "business screen is hidden on return");
    const before = apiCalls;
    assert.equal(await page.evaluate(async () => (await fetch('/api/private')).status), 423);
    assert.equal(apiCalls, before, "locked client does not make a business request");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: `tmp/app-lock-ui/locked-${width}.png` });
    await page.evaluate(() => { window.__cancel = true; });
    await click("Unlock ERP");
    await page.waitForFunction(() => document.body.innerText.includes("ERP stays locked"));
    assert.equal(await page.$eval('#secret', element => Boolean(element.closest('[hidden]'))), true);
    await page.evaluate(() => { window.__cancel = false; });
    await click("Unlock ERP");
    await page.waitForSelector('#secret', { visible: true });
    await click("Close private modal");
    await background.close();
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await page.waitForSelector('[aria-label="ERP app lock"]');
    await click("Unlock ERP"); await page.waitForSelector('#secret', { visible: true });
    // A new page has no remembered unlocked state. The fixture server models
    // the one-use document entry enforced by app-lock-gate.ts.
    await page.close(); page = await browser.newPage(); attach();
    await page.setViewport({ width, height: 900 });
    await page.goto(url, { waitUntil: "networkidle0" });
    assert.match(page.url(), /\/unlock/);
    await page.waitForSelector('[aria-label="ERP app lock"]');
    assert.equal(await page.$('#secret'), null, "private content is not mounted before unlocking a new app instance");
    assert.equal(await page.evaluate(() => window.__verificationCalls || 0), 0, "native verification waits for an explicit user gesture");
    await click("Unlock ERP");
    await page.waitForSelector('#secret', { visible: true });
    assert.equal(new URL(page.url()).pathname, "/", "unlock navigation does not relock itself");
    await page.type('input[type="password"]', "fixture-password");
    await click("Turn off app lock");
    await page.waitForFunction(() => document.body.innerText.includes("App lock is off"));
  }
  await click("Enable fingerprint app lock");
  await page.waitForFunction(() => document.body.innerText.includes("App lock is on"));
  await page.evaluate(() => window.__setAuthStatus('unauthenticated'));
  await page.waitForSelector('[aria-label="ERP app lock"]');
  assert.equal(await page.$eval('#secret', element => Boolean(element.closest('[hidden]'))), true, "expired login cannot leave the workspace visible");
  await click("Sign out and use normal login");
  await page.waitForFunction(() => window.__signedOut);
  assert.ok(deviceSelections.length > 0 && deviceSelections.every(id => id === "fixture-key"), "enable and unlock prefer the setup saved for this account/browser");
  assert.deepEqual(errors, []);
  console.log("App-lock UI passed at 320, 390 and 1440px: real tab background/return, privacy cover, blocked requests, native-dialog blur, cancellation/retry, BFCache restore, close/reopen, verified navigation and disable.");
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
