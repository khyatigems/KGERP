import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ListingPreparationClient } from "../components/marketplace/listing-preparation-client";
import { MarketplaceDraftsClient } from "../components/marketplace/marketplace-drafts-client";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";
import { readFile, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
Object.assign(globalThis, { React });
async function main() {
 const directory = await mkdtemp(join(tmpdir(), "marketplace-ui-"));
 const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
 const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch: async () => {} };
 const draft = { id: "preview", sku: "KGLGZIRGRN130000288", title: "Cubic Zirconia Peridot Green – 13 cts", itemName: "Cubic Zirconia Peridot Green", shop: "Khyatigemsofficial", shopId: "shop", platform: "ETSY", externalId: "4592981714", price: 85, currency: "USD", updatedAt: "2026-10-11" };
 const browser = await puppeteer.launch({ headless: true });
 try {
  for (const [name, component] of [["create", React.createElement(ListingPreparationClient, { ebayShops: [], etsyShops: [] })], ["drafts", React.createElement(MarketplaceDraftsClient, { drafts: [draft, { ...draft, id: "ebay-preview", platform: "EBAY", externalId: null }] })]] as const) {
   const markup = renderToStaticMarkup(React.createElement(AppRouterContext.Provider, { value: router }, component));
   for (const width of [1280, 390]) {
    for (const theme of ["light", "dark"]) {
    const page = await browser.newPage(); await page.setViewport({ width, height: 900 });
    await page.setContent(`<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style></head><body style="padding:16px;font-family:Arial">${markup}</body></html>`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    assert.equal(overflow, false, `${name} overflows at ${width}`);
    if (name === "create") assert.equal(await page.$('[aria-current="step"]'), null);
    if (name === "drafts") { await page.click("details.group > summary"); assert.ok(await page.$("details[open]")); }
    const path = join(directory, `${name}-${width}-${theme}.png`); await page.screenshot({ path, fullPage: true }); console.log(path); await page.close();
    }
   }
  }
  await writeFile(join(directory, "qa.txt"), "Actual React components rendered with project CSS. Desktop/mobile widths have no horizontal overflow. Draft details expand.");
 } finally { await browser.close(); }
}
void main();
