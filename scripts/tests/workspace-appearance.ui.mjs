// Isolated browser review of the real appearance controls; no database or user account needed.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const root = process.cwd();
const output = resolve(root, "tmp/theme-review");
await mkdir(output, { recursive: true });
const bundle = await build({ stdin: { contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { WorkspaceAppearanceProvider } from './components/workspace-appearance-provider';
import { ThemeToggle } from './components/theme-toggle';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './components/ui/table';
createRoot(document.getElementById('app')).render(
<SessionProvider session={null}><ThemeProvider attribute="class" defaultTheme="light" themes={['light','dark','dim']} value={{light:'light',dark:'dark',dim:'dark'}} enableSystem>
<WorkspaceAppearanceProvider><div className="erp-workspace flex min-h-screen">
<aside className="workspace-sidebar w-56 shrink-0 p-5 bg-sidebar text-sidebar-foreground"><b className="text-lg">KhyatiGems™</b><nav className="my-8 space-y-5"><div>Business overview</div><div>Gemstone inventory</div><div>Sales & invoices</div></nav><ThemeToggle/></aside>
<main className="min-w-0 flex-1 space-y-6 p-6"><header className="workspace-header"><div className="workspace-header-content"><h1>Business overview</h1><p>Your gemstone business at a glance</p></div></header><div className="grid grid-cols-2 gap-4"><section data-slot="card" className="rounded-xl border bg-card p-6"><p className="text-muted-foreground">Stock value</p><strong className="text-2xl">₹12,48,500</strong></section><section data-slot="card" className="rounded-xl border bg-card p-6"><p className="text-muted-foreground">Open invoices</p><strong className="text-2xl">24</strong></section></div>
<Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead></TableRow></TableHeader><TableBody><TableRow data-state="selected"><TableCell>INV-1042</TableCell><TableCell>Gemstone Trading Co.</TableCell><TableCell>₹48,500</TableCell></TableRow><TableRow><TableCell>INV-1043</TableCell><TableCell>Emerald Collections</TableCell><TableCell>₹72,000</TableCell></TableRow></TableBody></Table></main>
</div></WorkspaceAppearanceProvider></ThemeProvider></SessionProvider>);`, resolveDir: root, loader: "tsx" }, bundle: true, write: false, format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" }, logLevel: "silent" });
const globals = await postcss([tailwind()]).process(await readFile(resolve(root, "app/globals.css"), "utf8"), { from: resolve(root, "app/globals.css") });
const css = globals.css + await readFile(resolve(root, "app/workspace-theme.css"), "utf8");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") { res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text); }
  else if (req.url === "/style.css") { res.setHeader("Content-Type", "text/css"); res.end(css); }
  else { res.setHeader("Content-Type", "text/html"); res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>'); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  await page.setViewport({ width: 1280, height: 950 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  await page.waitForSelector('button[aria-label="Appearance settings"]:not([disabled])');
  const contrastFailures = await page.evaluate(() => {
    const root = document.documentElement;
    const saved = { className: root.className, dataset: { ...root.dataset } };
    const failures = [];
    const luminance = hex => {
      const values = hex.trim().replace('#', '').match(/.{2}/g).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
      return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
    };
    for (const mode of ['light', 'dark', 'dim']) for (const surface of ['slate', 'stone', 'sage']) for (const palette of ['sapphire-facet', 'emerald-crystal', 'amethyst-prism']) {
      root.className = mode === 'light' ? 'light' : 'dark'; root.dataset.workspaceMode = mode; root.dataset.surface = surface; root.dataset.workspaceTheme = palette;
      const styles = getComputedStyle(root);
      for (const [foreground, background] of [['--foreground', '--background'], ['--card-foreground', '--card'], ['--muted-foreground', '--card'], ['--muted-foreground', '--muted'], ['--primary-foreground', '--primary'], ['--accent-foreground', '--accent'], ['--sidebar-foreground', '--sidebar'], ['--sidebar-accent-foreground', '--sidebar-accent']]) {
        // All workspace tokens are opaque six-digit hex values.
        const normalize = value => value.length === 4 ? '#' + [...value.slice(1)].map(c => c+c).join('') : value;
        const a = luminance(normalize(styles.getPropertyValue(foreground).trim())); const b = luminance(normalize(styles.getPropertyValue(background).trim()));
        const ratio = (Math.max(a,b) + .05) / (Math.min(a,b) + .05);
        if (ratio < 4.5) failures.push({ mode, surface, palette, foreground, background, ratio });
      }
    }
    root.className = saved.className; Object.assign(root.dataset, saved.dataset);
    return failures;
  });
  assert.deepEqual(contrastFailures, [], 'Core text pairs must meet 4.5:1 contrast across all 27 combinations');
  const click = async (text) => {
    await page.evaluate(label => {
      const button = [...document.querySelectorAll('[data-slot="popover-content"] button')].find(item => item.textContent.trim() === label);
      if (!button) throw Error(`Missing control: ${label}`);
      button.click();
    }, text);
  };
  const open = async () => {
    await page.click('button[aria-label="Appearance settings"]');
    await page.waitForFunction(() => { const panel = document.querySelector('[data-slot="popover-content"]'); return panel && getComputedStyle(panel).opacity === '1' && panel.getAnimations().every(animation => animation.playState === 'finished'); });
  };
  await page.screenshot({ path: resolve(output, "english-slate.png") });
  await open();
  await click("Warm Stone");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.surface), "slate", "Preview must not change the workspace");
  await click("Cancel");
  await open();
  await click("Warm Stone"); await click("Dim"); await click("Emerald"); await click("Dark sidebar"); await click("Compact"); await click("Large");
  await page.screenshot({ path: resolve(output, "appearance-preview.png") });
  await click("Apply");
  await page.waitForFunction(() => document.documentElement.dataset.workspaceMode === "dim" && document.documentElement.classList.contains("dark"));
  let state = await page.evaluate(() => ({ ...document.documentElement.dataset }));
  assert.equal(state.surface, "stone"); assert.equal(state.density, "compact"); assert.equal(state.textSize, "large"); assert.equal(state.sidebar, "dark");
  assert.equal(await page.$eval('[data-slot="table-cell"]', el => getComputedStyle(el).paddingTop), "9px");
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.documentElement.dataset.density === "compact");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.workspaceMode), "dim");
  await page.screenshot({ path: resolve(output, "dim-emerald.png") });
  await open(); await click("Reset preview"); await click("Apply");
  await page.waitForFunction(() => document.documentElement.dataset.density === "comfortable");
  assert.equal(await page.evaluate(() => document.documentElement.dataset.surface), "slate");
  await page.setViewport({ width: 390, height: 844 });
  // Isolate the control at phone width; the actual sidebar is replaced by mobile navigation in the ERP.
  await page.addStyleTag({ content: '.workspace-sidebar{width:100px!important;padding:12px!important}.workspace-sidebar nav,.workspace-sidebar>b,main{display:none}' });
  await open();
  const bounds = await page.$eval('[data-slot="popover-content"]', el => ({ left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right, bottom: el.getBoundingClientRect().bottom, width: el.clientWidth, scroll: el.scrollWidth }));
  assert.ok(bounds.left >= 0 && bounds.right <= 391 && bounds.scroll <= bounds.width, "Appearance panel must fit a phone viewport");
  assert.ok(bounds.bottom <= 844, 'Appearance panel must fit vertically');
  await page.screenshot({ path: resolve(output, "mobile-appearance.png") });
  assert.deepEqual(errors, []);
  console.log(`Appearance preview/cancel/apply/reset, dim mode, reload persistence, compact sizing and mobile layout passed. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
