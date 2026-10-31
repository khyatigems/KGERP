import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

const root = process.cwd();
const out = resolve(root, "tmp/feedback-review");
await mkdir(out, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {toast, Toaster} from './lib/erp-feedback';
      window.erpToast=toast;
      createRoot(document.getElementById('app')).render(<main><h1>Notification review</h1><Toaster/></main>);
    `,
    resolveDir: root, loader: "tsx",
  },
  bundle: true, write: false, format: "iife", jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "silent",
});
const styles = await postcss([tailwind()]).process(await readFile(resolve(root, "app/globals.css"), "utf8"), { from: resolve(root, "app/globals.css") });
const css = styles.css + await readFile(resolve(root, "app/workspace-theme.css"), "utf8") + await readFile(resolve(root, "components/ui/rich-feedback.css"), "utf8");
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript"); res.end(bundle.outputFiles[0].text);
  } else if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css"); res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>');
  }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: "networkidle0" });
  await page.waitForSelector("h1");
  const settle = () => new Promise(r => setTimeout(r, 550));
  const clear = async () => {
    await page.evaluate(() => window.erpToast.dismiss());
    await page.waitForFunction(() => document.querySelectorAll("[data-sonner-toast]").length === 0);
  };
  const checkLayout = async () => {
    const issues = await page.evaluate(() => {
      const issues = [];
      const cards = [...document.querySelectorAll('[data-sonner-toast][data-visible="true"]')];
      const rects = cards.map(card => card.getBoundingClientRect());
      cards.forEach((card, i) => {
        const rect = rects[i];
        if (getComputedStyle(card).position !== "absolute") issues.push("stack positioning overridden");
        if (rect.left < 0 || rect.right > innerWidth || rect.top < 0 || rect.bottom > innerHeight) issues.push("card outside viewport");
        for (const element of card.querySelectorAll('[data-close-button], [data-icon], [data-content], [data-button]')) {
          const box = element.getBoundingClientRect();
          if (box.left < rect.left || box.right > rect.right || box.top < rect.top || box.bottom > rect.bottom) issues.push("clipped " + element.outerHTML.slice(0, 90));
        }
        const close = card.querySelector('[data-close-button]');
        if (close && close.getBoundingClientRect().left < rect.right - 40) issues.push("close button is not at the right edge");
        const icon = card.querySelector('[data-icon]');
        if (icon && Math.round(icon.getBoundingClientRect().width) !== 38) issues.push("icon styles overridden");
        for (let j = i + 1; j < rects.length; j++) {
          const other = rects[j];
          if (rect.left < other.right && rect.right > other.left && rect.top < other.bottom && rect.bottom > other.top) issues.push("overlapping cards");
        }
      });
      return issues;
    });
    assert.deepEqual(issues, []);
  };
  for (const [theme, width] of [["light", 1280], ["dim", 1280], ["dark", 390], ["light", 320]]) {
    await clear();
    await page.setViewport({ width, height: 900 });
    await page.evaluate(theme => {
      document.documentElement.classList.toggle("dark", theme !== "light");
      document.documentElement.dataset.workspaceTheme = "emerald-crystal";
      document.documentElement.dataset.workspaceMode = theme;
      window.erpToast.success("Note copied", { duration: Infinity });
      window.erpToast.error("Your note could not be saved. Your changes are still available.", { duration: Infinity, action: { label: "Retry save", onClick: () => { window.retries = (window.retries || 0) + 1; } } });
      window.erpToast.info("Customer created", { duration: Infinity, action: { label: "View customer", onClick: () => {} }, cancel: { label: "Later", onClick: () => {} } });
      window.erpToast.warning("Stock is running low. Review inventory before selling.", { duration: Infinity });
    }, theme);
    await page.waitForFunction(() => document.querySelectorAll('[data-sonner-toast][data-mounted="true"]').length === 4);
    await settle();
    await checkLayout();
    assert.equal(await page.$eval('[data-type="error"]', el => getComputedStyle(el).getPropertyValue("--feedback-accent").trim()), "#dc5260");
    assert.equal(await page.$eval('[data-type="info"]', el => getComputedStyle(el).getPropertyValue("--feedback-accent").trim()), "#548be5");
    assert.equal(await page.$eval('[data-type="success"] [data-icon]', el => getComputedStyle(el).animationName), "erp-feedback-notice");
    const iconIssues = await page.$$eval('[data-icon]', badges => badges.flatMap(badge => {
      const svg = badge.querySelector('svg');
      if (!svg) return ["missing icon"];
      const rect = svg.getBoundingClientRect();
      const frame = badge.getBoundingClientRect();
      const issues = [];
      if (rect.width !== 20 || rect.height !== 20) issues.push("icon size distorted");
      if (Math.abs(rect.left + rect.width / 2 - frame.left - frame.width / 2) > .5 || Math.abs(rect.top + rect.height / 2 - frame.top - frame.height / 2) > .5) issues.push("icon is not centered in its badge");
      if (getComputedStyle(badge).transform !== "none") issues.push("badge scales the SVG");
      // The geometry plus half of its stroke must fit inside the viewBox.
      const box = svg.getBBox();
      const inset = Number(svg.getAttribute('stroke-width')) / 2;
      if (box.x - inset < 0 || box.y - inset < 0 || box.x + box.width + inset > 24 || box.y + box.height + inset > 24) issues.push("icon stroke clipped");
      return issues;
    }));
    assert.deepEqual(iconIssues, [], "notification SVGs keep their intended geometry");
    assert.ok(await page.$('[data-type="success"] svg.lucide-circle-check circle'), "success has a complete circle");
    assert.ok(await page.$('[data-type="error"] svg.lucide-circle-x circle'), "errors use the matching circle style");
    await page.screenshot({ path: resolve(out, `${theme}-${width}.png`) });
    if (theme === "dim") {
      const clip = await page.$$eval('[data-sonner-toast]', cards => {
        const rects = cards.map(card => card.getBoundingClientRect());
        const left = Math.min(...rects.map(rect => rect.left)) - 8;
        const top = Math.min(...rects.map(rect => rect.top)) - 8;
        return { x: left, y: top, width: Math.max(...rects.map(rect => rect.right)) - left + 8, height: Math.max(...rects.map(rect => rect.bottom)) - top + 8 };
      });
      await page.screenshot({ path: resolve(out, 'notification-icons-centered.png'), clip });
    }
    await page.click('[data-type="error"] [data-action]');
    assert.ok(await page.evaluate(() => window.retries > 0), "retry invokes its handler");
    await page.focus('[data-type="success"] [data-close-button]');
    await page.keyboard.press("Enter");
    await page.waitForSelector('[data-type="success"]', { hidden: true });
  }
  await clear();
  await page.evaluate(() => window.erpToast.loading("Saving note", { id: "save" }));
  await page.waitForSelector('[data-type="loading"]');
  await settle();
  assert.equal(await page.$('[data-type="loading"] [data-close-button]'), null);
  assert.equal(await page.$eval('[data-type="loading"]', el => getComputedStyle(el, "::after").bottom), "0px");
  await page.evaluate(() => window.erpToast.success("Note saved", { id: "save" }));
  await page.waitForSelector('[data-type="success"] [data-close-button]');
  assert.equal(await page.$$eval("[data-sonner-toast]", els => els.length), 1, "loading updates the existing card");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  assert.equal(await page.$eval('[data-icon]', el => getComputedStyle(el).animationName), "none");
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.evaluate(() => document.documentElement.dataset.motion = "reduced");
  assert.equal(await page.$eval('[data-icon]', el => getComputedStyle(el).animationName), "none");
  assert.deepEqual(errors, []);
  console.log(`Toast layout, actions, keyboard dismissal, stacking, loading, themes and reduced motion passed. Screenshots: ${out}`);
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
}
