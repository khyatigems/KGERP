// Real SecurityForm with a synthetic local API. No ERP account or email is used.
import assert from "node:assert/strict";
import { readFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

await mkdir("output/security", { recursive: true });
const bundle = await build({ stdin: { contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SecurityForm } from './app/(dashboard)/settings/security/security-form';
createRoot(document.getElementById('app')).render(<main className="mx-auto max-w-3xl space-y-5 p-5"><p className="text-xs text-muted-foreground">UI QA — synthetic configuration and email responses</p><h1 className="text-2xl font-semibold">Security &amp; 2FA</h1><SecurityForm initial={{ enabled: !location.search.includes('disabled'), email: 'security@example.test', alerts: true, version: 'fixture' }} zohoConfigured={true} accountEmail="admin@example.test" recoveryRemaining={2} /></main>);
`, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic", define: { "process.env": '{"NODE_ENV":"production"}' } });
const css = (await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" })).css;
const server = createServer(async (request, response) => {
  if (request.url === "/bundle.js") { response.setHeader("Content-Type", "text/javascript"); response.end(bundle.outputFiles[0].text); }
  else if (request.url === "/style.css") { response.setHeader("Content-Type", "text/css"); response.end(css); }
  else if (request.url === "/api/settings/security/recovery") {
    let body = ""; for await (const part of request) body += part;
    const data = JSON.parse(body); response.setHeader("Content-Type", "application/json");
    if (data.action === "request-code") response.end(JSON.stringify({ sent: true }));
    else if (data.code === "123456") response.end(JSON.stringify({ recoveryCodes: ["aabbccddeeff001122334455", "554433221100ffeeddccbbaa"] }));
    else { response.statusCode = 400; response.end(JSON.stringify({ error: "Invalid verification code." })); }
  }
  else if (request.url === "/api/settings/security") {
    let body = ""; for await (const part of request) body += part;
    const data = JSON.parse(body); response.setHeader("Content-Type", "application/json");
    if (data.action === "request-code") response.end(JSON.stringify({ sent: true, needsCurrentCode: true }));
    else if (data.code === "123456" && data.currentCode === "654321") response.end(JSON.stringify({ saved: true, message: "2FA is enabled. Save your recovery codes, then sign in again.", recoveryCodes: ["112233445566778899aabbcc", "ffeeddccbbaa998877665544"] }));
    else { response.statusCode = 400; response.end(JSON.stringify({ error: "Invalid, expired or already used code." })); }
  } else { response.setHeader("Content-Type", "text/html"); response.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
const downloadDirectory = await mkdtemp(path.join(tmpdir(), "kg-recovery-downloads-"));
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  // Synthetic clipboard keeps browser tests from changing the user's clipboard.
  await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async value => { window.__copiedCodes = value; } } }));
  const cdp = await page.createCDPSession();
  await cdp.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDirectory });
  const errors = []; page.on("pageerror", error => { errors.push(error.message); console.error("UI error:", error.message); });
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1050 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("#otp-email");
    assert.equal(await page.$eval("#regenerate-recovery-codes", button => button.disabled), false, "recovery tools are visible before saving settings");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `initial layout overflow at ${width}`);
    await page.screenshot({ path: `output/security/settings-${width}.png`, fullPage: true });
    await page.$eval("#otp-email", element => { element.value = ""; });
    await page.type("#otp-email", "new@example.test");
    await page.type("#security-password", "synthetic-password");
    await page.click('button[type="submit"]');
    await page.waitForSelector("#current-security-code");
    await page.type("#security-code", "000000"); await page.type("#current-security-code", "654321");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.querySelector('[role="alert"]')?.textContent.includes("Invalid"));
    await page.focus("#security-code"); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control"); await page.keyboard.press("Backspace"); await page.type("#security-code", "123456");
    assert.equal(await page.$eval("#security-code", element => element.value), "123456");
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.textContent.includes("Save your recovery codes now"));
    assert.equal(await page.$$eval("code", values => values.length), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `recovery layout overflow at ${width}`);
    assert.equal(await page.$eval("#security-password", input => input.value), "", "password cleared after saving");
    await page.click("#copy-recovery-codes");
    await page.waitForFunction(() => window.__copiedCodes?.includes("112233445566778899aabbcc"));
    assert.match(await page.evaluate(() => window.__copiedCodes), /Account: admin@example.test/);
    const downloadFile = path.join(downloadDirectory, "khyatigems-erp-recovery-codes.txt");
    await rm(downloadFile, { force: true });
    await page.click("#download-recovery-codes");
    let downloaded = "";
    for (let i = 0; i < 100; i++) { try { downloaded = await readFile(downloadFile, "utf8"); break; } catch { await new Promise(resolve => setTimeout(resolve, 50)); } }
    assert.match(downloaded, /112233445566778899aabbcc/);
    assert.match(downloaded, /Each code works once/);
    await page.screenshot({ path: `output/security/recovery-${width}.png`, fullPage: true });

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.click("#regenerate-recovery-codes");
    await page.type("#recovery-password", "synthetic-password");
    await page.click("#recovery-submit");
    await page.waitForSelector("#recovery-code");
    await page.type("#recovery-code", "123456");
    await page.click("#recovery-submit");
    await page.waitForFunction(() => document.querySelector("code")?.textContent === "aabbccddeeff001122334455");
    assert.equal(await page.$eval("#security-password", input => input.value), "", "recovery generation does not need a settings change");
  }
  await page.goto(`${url}/?disabled`, { waitUntil: "networkidle0" });
  assert.equal(await page.$eval("#regenerate-recovery-codes", button => button.disabled), true, "recovery generation requires active 2FA");
  const emailHtml = await readFile("output/security/otp-email-preview.html", "utf8");
  for (const width of [640, 390]) {
    await page.setViewport({ width, height: 1100 });
    await page.setContent(emailHtml, { waitUntil: "load" });
    assert.equal(await page.$eval(".otp-value", element => element.textContent), "012345");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `OTP email overflow at ${width}`);
    await page.screenshot({ path: `output/security/otp-email-${width}.png`, fullPage: true });
  }
  assert.deepEqual(errors, []);
  console.log("Security settings UI passed: desktop/mobile, permanent recovery section, real download, clipboard export, verified replacement, OTP email layouts and no horizontal overflow.");
} finally {
  if (browser) await browser.close(); await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(downloadDirectory).startsWith(path.resolve(tmpdir()) + path.sep));
  await rm(downloadDirectory, { recursive: true, force: true });
}
