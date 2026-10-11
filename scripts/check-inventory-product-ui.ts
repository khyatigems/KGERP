import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InventoryProductDetails } from "../components/inventory/inventory-product-details";
import { useForm } from "react-hook-form";
import { Form } from "../components/ui/form";
import { NotesSection } from "../components/inventory/inventory-notes";
import type { FormInputValues } from "../components/inventory/inventory-form.types";
import { InventoryDimensions } from "../components/inventory/inventory-dimensions";
import { productFactsSchema, productFieldCatalog } from "../lib/inventory-product-facts";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";
import { readFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
Object.assign(globalThis, { React });
function DescriptionPreview() {
 const form = useForm<FormInputValues>({ defaultValues: { description: "<p>Saved eBay description</p>", etsyDescription: "Saved Etsy description" } });
 // FormProvider requires children in its typed props when called without JSX.
 // eslint-disable-next-line react/no-children-prop
 return React.createElement(Form<FormInputValues>, { ...form, children: React.createElement(NotesSection, { form }) });
}
async function main() {
 const directory = await mkdtemp(join(tmpdir(), "inventory-product-ui-"));
 const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
 const facts = productFactsSchema.parse({ ebayCategoryId: "262027", etsyCategoryId: productFieldCatalog.etsy.find((entry) => / > Gemstones$/.test(entry.category.path))?.category.taxonomyId, attributes: { "craft type": "Jewelry making", "stone source": "Lab grown" } });
 const markup = renderToStaticMarkup(React.createElement("main", { className: "mx-auto max-w-3xl space-y-6" }, React.createElement(InventoryDimensions, { value: "11 x 5.5 x 9", onChange() {} }), React.createElement(InventoryProductDetails, { value: facts, onChange() {} }), React.createElement(DescriptionPreview)));
 const browser = await puppeteer.launch({ headless: true });
 try {
  for (const width of [1280, 390]) for (const theme of ["light", "dark"]) {
   const page = await browser.newPage(); await page.setViewport({ width, height: 900 });
   await page.setContent(`<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css.css}</style></head><body style="padding:16px;font-family:Arial">${markup}</body></html>`);
   assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
   assert.equal(await page.$$eval("label", (labels) => labels.filter((label) => label.textContent?.startsWith("Craft type")).length), 1);
   assert.equal(await page.$$eval("label", (labels) => labels.filter((label) => label.textContent?.startsWith("Gemstone Creation")).length), 1);
   assert.equal(await page.$eval('[aria-label="Width (mm)"]', (element) => (element as HTMLSelectElement).value), "5.5");
   assert.equal(await page.$eval("#inventory-ebay-description-editor", (element) => (element as HTMLElement).hidden), true);
   assert.equal(await page.$eval("#inventory-etsy-description-editor", (element) => (element as HTMLElement).hidden), true);
   assert.equal(await page.$eval("#inventory-ebay-description-editor textarea", (element) => (element as HTMLTextAreaElement).value), "<p>Saved eBay description</p>");
   const path = join(directory, `product-details-${width}-${theme}.png`); await page.screenshot({ path, fullPage: true }); console.log(path); await page.close();
  }
 } finally { await browser.close(); }
}
void main();
