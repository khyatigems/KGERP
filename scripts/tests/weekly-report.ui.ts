import React from "react";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WeeklyReports } from "@/components/settings/weekly-reports";
import WorkTrackerPage from "@/app/(dashboard)/work-tracker/page";
import { defaultSettings } from "@/lib/weekly-report/config";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";
import { mkdir, readFile } from "node:fs/promises";
Object.assign(globalThis, { React });
async function main() {
 await mkdir("output/weekly-reports", { recursive: true });
 const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
 const markup = renderToStaticMarkup(React.createElement(WeeklyReports, { initial: { settings: defaultSettings, version: null, sender: null, shops: [], nextScheduled: "2026-10-26T03:30:00Z", dispatcherLastSeen: null, latestAccepted: null } }));
 const browser = await puppeteer.launch({ headless: true });
 try {
  for (const [name, content] of [["settings", markup], ["work-tracker-loading", renderToStaticMarkup(React.createElement(WorkTrackerPage))]]) for (const width of [1440, 390]) {
   const page = await browser.newPage(); await page.setViewport({ width, height: 1050 });
   await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style></head><body style="padding:20px;background:white;color:#172b42;font-family:Arial"><p style="font-size:11px">UI QA PREVIEW — actual component; Settings uses synthetic configuration, tracker shows initial loading state</p>${content}</body></html>`);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Settings overflow at ${width}`);
   if (name === "settings") assert.ok(await page.$('input[type="time"]'));
   await page.screenshot({ path: `output/weekly-reports/${name}-${width}.png`, fullPage: true }); await page.close();
  }
  console.log("Weekly Settings visual smoke test passed: actual React component and project CSS, desktop/mobile without horizontal overflow. Screenshots output/weekly-reports/settings-{1440,390}.png");
 } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
