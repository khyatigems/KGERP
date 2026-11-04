// Explicit UI fixtures; cryptographic and real Auth.js coverage lives in
// passkeys.integration.ts, which uses Chrome's virtual CTAP2 authenticator.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { build } from "esbuild";
import puppeteer from "puppeteer";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const bundle = await build({ stdin: { contents: `import React from 'react';import{createRoot}from'react-dom/client';import{PasskeySettings}from'./components/settings/passkey-settings';import{LoginForm}from'./components/auth/login-form';const view=new URLSearchParams(location.search).get('view');createRoot(document.getElementById('app')).render(view==='login'?<LoginForm/>:<PasskeySettings prompt={view==='prompt'}/>);`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' }, plugins: [{ name: "fixtures", setup(builder) {
  builder.onResolve({ filter: /^(next\/navigation|next-auth\/react|erp-webauthn-browser)$/ }, args => ({ path: args.path, namespace: "fixtures" }));
  builder.onLoad({ filter: /.*/, namespace: "fixtures" }, args => ({ contents: args.path === "next/navigation" ? `export const useRouter=()=>({push(){},refresh(){}});` : args.path === "next-auth/react" ? `export async function signIn(provider,credentials){window.__credentials=credentials;return{error:null}}` : `export const browserSupportsWebAuthn=()=>true;export const platformAuthenticatorIsAvailable=async()=>true;export const startRegistration=async()=>({id:'fixture'});export const startAuthentication=async()=>({id:'fixture'});` }));
} }] });
const css = (await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" })).css;
let preference = "0", keys = [], requests = [];
const server = createServer(async (req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); return; }
  if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); return; }
  if (req.url?.startsWith("/api/")) {
    res.setHeader("Content-Type", "application/json");
    if (req.method === "GET") { res.end(JSON.stringify({ keys, promptAfter: preference })); return; }
    let raw = ""; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw); requests.push(body);
    if (req.url === "/api/auth/otp") { res.end(JSON.stringify({ required: true, method: "authenticator", emailAvailable: true })); return; }
    if (body.action === "preference") preference = body.preference === "never" ? "never" : body.preference === "reset" ? "0" : String(Date.now() + 604800000);
    if (body.action === "register-verify") keys = [{ id: "fixture", name: "Test phone", createdAt: new Date().toISOString(), lastUsedAt: null }];
    if (body.action === "remove") keys = [];
    res.end(JSON.stringify(body.action === "login-verify" ? { verified: true, email: "fixture@example.test" } : { saved: true })); return;
  }
  res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><main style="max-width:700px;margin:auto;padding:16px"><div id="app"></div></main><script src="/bundle.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  await mkdir("tmp/passkeys-ui", { recursive: true });
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36");
  const url = `http://127.0.0.1:${server.address().port}`;
  async function click(text) { await page.locator(`::-p-text(${text})`).click(); }
  for (const width of [320, 390, 1440]) {
    preference = "0"; keys = [];
    await page.setViewport({ width, height: 1000, isMobile: width < 500, hasTouch: true });
    await page.goto(`${url}/?view=prompt`, { waitUntil: "networkidle0" });
    await page.waitForSelector('[role="dialog"]');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.screenshot({ path: `tmp/passkeys-ui/prompt-${width}.png` });
    await click("Remind me in 7 days");
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.$('[role="dialog"]'), null, "later suppresses repeat prompts");
    preference = "0";
    await page.reload({ waitUntil: "networkidle0" }); await click("Don’t ask again");
    await page.waitForFunction(() => !document.querySelector('[role="dialog"]'));
    await page.reload({ waitUntil: "networkidle0" });
    assert.equal(await page.$('[role="dialog"]'), null, "never suppresses repeat prompts");
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.type('input[type="password"]', "fixture-password");
    await page.type('input[placeholder*="My phone"]', "Test phone");
    await click("Enable now");
    await page.waitForFunction(() => document.body.innerText.includes("Add another passkey"));
    await page.screenshot({ path: `tmp/passkeys-ui/settings-${width}.png` });
    await page.goto(`${url}/?view=prompt`, { waitUntil: "networkidle0" });
    assert.equal(await page.$('[role="dialog"]'), null, "enrolled accounts are not prompted");
  }
  await page.goto(url, { waitUntil: "networkidle0" });
  await click("Enable mobile enrollment reminders");
  await page.waitForFunction(() => document.body.innerText.includes("Mobile enrollment reminders enabled."));
  assert.equal(preference, "0");
  await page.type('input[type="password"]', "fixture-password");
  await click("Remove");
  await page.waitForFunction(() => document.body.innerText.includes("Passkey removed from ERP."));
  assert.equal(keys.length, 0);
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36");
  await page.goto(`${url}/?view=prompt`, { waitUntil: "networkidle0" });
  assert.equal(await page.$('[role="dialog"]'), null, "desktop users are not automatically prompted");
  await page.goto(`${url}/?view=login`, { waitUntil: "networkidle0" });
  await click("Sign in with passkey");
  await page.waitForFunction(() => document.body.innerText.includes("Passkey verified for fixture@example.test"));
  assert.equal(await page.$eval('#password', element => element.required), false);
  await page.type('#login-verification', "123456");
  await click("Verify and sign in");
  await page.waitForFunction(() => window.__credentials);
  const credentials = await page.evaluate(() => window.__credentials);
  assert.equal(credentials.passkey, "true"); assert.equal(credentials.authenticatorCode, "123456");
  await page.screenshot({ path: "tmp/passkeys-ui/login-mfa.png" });
  assert.ok(requests.some(request => request.action === "preference" && request.preference === "never"));
  assert.deepEqual(errors, []);
  console.log("Passkey UI passed at 320, 390 and 1440px: mobile prompt, saved later/never preferences, enrollment, enrolled-account suppression, settings and passkey-to-MFA sign-in.");
} finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
