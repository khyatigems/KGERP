import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";
import QRCode from "qrcode";

await mkdir("output/security", { recursive: true });
const qr = await QRCode.toDataURL("otpauth://totp/KhyatiGems%20ERP:synthetic@example.test?secret=GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ&issuer=KhyatiGems%20ERP");
const codes = ["112233445566778899aabbcc", "ffeeddccbbaa998877665544"];
const bundle = await build({ stdin: { contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {AuthenticatorForm} from './components/settings/authenticator-form';
import {LoginForm} from './components/auth/login-form';
const view = new URLSearchParams(location.search).get('view');
createRoot(document.getElementById('app')).render(view === 'login' ? <main className="mx-auto max-w-md bg-slate-900 p-5"><LoginForm /></main> : <main className="mx-auto max-w-3xl p-5"><AuthenticatorForm enabled={view === 'enabled'} recoveryRemaining={8} accountEmail="synthetic@example.test" emailEnabled={true} configured={true}/></main>);
`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env": '{"NODE_ENV":"production"}' }, plugins: [{ name: "synthetic-next", setup(builder) {
  builder.onResolve({ filter: /^next\/navigation$|^next-auth\/react$/ }, args => ({ path: args.path, namespace: "stub" }));
  builder.onLoad({ filter: /.*/, namespace: "stub" }, args => ({ contents: args.path === "next/navigation" ? `export const useRouter = () => ({push(){},refresh(){}});` : `export async function signIn(provider, credentials){window.__credentials=credentials;return {error:null};} export async function signOut(){window.__signedOut=true;}` }));
} }] });
const css = (await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" })).css;
const requests = [];
const server = createServer(async (request, response) => {
  if (request.url === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); }
  else if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else if (request.url?.startsWith("/api/")) {
    let raw = ""; for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw); requests.push({ url: request.url, ...body });
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/api/auth/otp") response.end(JSON.stringify(body.method === "email" ? { required: true, method: "email", recipient: "s***@example.test", authenticatorAvailable: true } : { required: true, method: "authenticator", emailAvailable: true }));
    else if (body.action === "begin") response.end(JSON.stringify({ secret: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", version: "11111111-1111-4111-8111-111111111111", qr, emailRequired: true }));
    else response.end(JSON.stringify({ saved: true, message: "Saved. Sign in again.", recoveryCodes: body.action === "activate" ? codes : [] }));
  } else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
  for (const width of [1440, 390, 320]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.type("#authenticator-password", "synthetic-password");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#authenticator-email-code");
    assert.equal(await page.$eval("img", element => element.naturalWidth > 0), true);
    await noOverflow();
    await page.screenshot({ path: `output/security/authenticator-setup-${width}.png`, fullPage: true });
    await page.type("#authenticator-email-code", "123456"); await page.type("#authenticator-code", "654321");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.textContent.includes("Save your personal recovery codes"));
    assert.equal(await page.$("#authenticator-password"), null, "password field is removed after saving");
    assert.equal(await page.$("img"), null, "setup secret is removed after activation");
    assert.deepEqual(await page.$$eval("code", nodes => nodes.map(node => node.textContent)), codes);
    await noOverflow();
    await page.screenshot({ path: `output/security/authenticator-recovery-${width}.png`, fullPage: true });
    await page.goto(`${url}?view=enabled`, { waitUntil: "networkidle0" });
    await page.type("#authenticator-password", "synthetic-password"); await page.type("#authenticator-code", codes[0]);
    await page.click('button[type="submit"]'); await page.waitForSelector('[role="status"]'); await noOverflow();

    await page.goto(`${url}?view=login`, { waitUntil: "networkidle0" });
    await page.type("#email", "synthetic@example.test"); await page.type("#password", "synthetic-password");
    await page.click('button[type="submit"]'); await page.waitForSelector("#login-verification");
    assert.match(await page.$eval('[role="status"]', node => node.textContent), /No email code was sent/);
    await noOverflow();
    await page.screenshot({ path: `output/security/authenticator-login-${width}.png`, fullPage: true });
    const clickText = async text => page.evaluate(value => [...document.querySelectorAll("button")].find(button => button.textContent.includes(value)).click(), text);
    await clickText("Send an email code instead"); await page.waitForFunction(() => document.body.textContent.includes("s***@example.test"));
    await clickText("Use authenticator app instead"); await page.waitForFunction(() => document.body.textContent.includes("No email code was sent"));
    await page.type("#login-verification", "654321"); await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.__credentials?.authenticatorCode === "654321");
    assert.equal(await page.evaluate(() => window.__credentials.otp), "", "app code is not submitted as an email OTP");
    await clickText("Use a recovery code"); await page.type("#login-verification", codes[0]); await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.__credentials?.recoveryCode === "112233445566778899aabbcc");
    assert.equal(await page.evaluate(() => window.__credentials.authenticatorCode), "");
  }
  assert.deepEqual(errors, []);
  assert.ok(requests.some(request => request.action === "activate" && request.emailCode === "123456"));
  assert.ok(requests.some(request => request.action === "remove" && request.code === codes[0]));
  console.log("Authenticator UI passed at 320, 390 and 1440px: QR enrollment, mailbox confirmation, recovery export display, removal, app login, email fallback and recovery selection.");
} finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
