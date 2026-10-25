import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

// Exercises actual shared components in a browser, without changing ERP records.
const fixture = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from './components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from './components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from './components/ui/alert-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from './components/ui/sheet';
const root = createRoot(document.getElementById('root'));
let version = 0;
window.mountModal = (kind, tone) => {
  version++;
  const longSku = 'KGLGCSBYLW100000284';
  const body = <div className="space-y-3"><label htmlFor="review-input">Review reference</label><input id="review-input" className="w-full rounded-xl border p-3" defaultValue={longSku} /><p>Representative content for responsive layout and keyboard checks.</p></div>;
  const node = kind === 'alert' ? <AlertDialog defaultOpen><AlertDialogContent tone={tone}><AlertDialogHeader><AlertDialogTitle>Review matching inventory</AlertDialogTitle><AlertDialogDescription asChild><div><p>Review this match before continuing.</p><div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">{longSku}</div></div></AlertDialogDescription></AlertDialogHeader>{body}<AlertDialogFooter><AlertDialogCancel data-testid="fixture-cancel">Cancel</AlertDialogCancel><AlertDialogAction>Continue</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog> : kind === 'sheet' ? <Sheet defaultOpen><SheetContent><SheetHeader><SheetTitle>Inventory details</SheetTitle><SheetDescription>Review item details.</SheetDescription></SheetHeader><div className="p-5">{body}</div><SheetFooter><SheetClose>Cancel</SheetClose></SheetFooter></SheetContent></Sheet> : <Dialog defaultOpen><DialogContent tone={tone}><DialogHeader><DialogTitle>{tone === 'destructive' ? 'Delete sale' : 'Confirm sale creation'}</DialogTitle><DialogDescription>Review this action before continuing.</DialogDescription></DialogHeader>{body}<DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant={tone === "destructive" ? "destructive" : "default"}>Continue</Button></DialogFooter></DialogContent></Dialog>;
  root.render(<React.Fragment key={version}>{node}</React.Fragment>);
};`;

const bundle = await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' } });
const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
await mkdir("output/modal-review", { recursive: true });
const browser = await puppeteer.launch({ headless: true });
try {
  for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewport({ width, height: 900 });
    await page.setContent(`<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><style>${css.css}</style></head><body class="bg-background text-foreground"><button id="opener">Open modal fixture</button><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    for (const [kind, tone] of [["dialog", "confirmation"], ["dialog", "destructive"], ["alert", "warning"], ["sheet", "default"]]) {
      await page.evaluate((kind, tone) => window.mountModal(kind, tone), kind, tone);
      const selector = kind === "alert" ? '[role="alertdialog"]' : '[role="dialog"]';
      await page.waitForSelector(selector);
      await page.waitForFunction((selector) => document.querySelector(selector)?.contains(document.activeElement), {}, selector);
      const bounds = await page.$eval(selector, (element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, labelled: Boolean(document.getElementById(element.getAttribute("aria-labelledby"))), brand: element.textContent.includes("Khyati ERP") };
      });
      assert.ok(bounds.left >= -1 && bounds.right <= width + 1, `${kind} overflows at ${width}`);
      assert.ok(bounds.labelled && bounds.brand, `${kind} lacks accessible title or shared brand`);
      for (let index = 0; index < 8; index++) {
        await page.keyboard.press("Tab");
        assert.ok(await page.$eval(selector, (element) => element.contains(document.activeElement)), `${kind} focus escaped`);
      }
      await page.screenshot({ path: `output/modal-review/${kind}-${tone}-${theme}-${width}.png` });
      if (kind === "alert") {
        await page.keyboard.press("Escape");
        assert.ok(await page.$(selector), "Alert dismissed without an explicit choice");
        await page.click('[data-testid="fixture-cancel"]');
      } else await page.keyboard.press("Escape");
      await page.waitForSelector(`${selector}[data-state="open"]`, { hidden: true });
    }
    assert.deepEqual(errors, [], `Browser errors at ${theme}/${width}`);
    await page.close();
  }
  console.log("Modal browser checks passed: shared dialog, destructive dialog, warning alert and sheet; desktop/mobile; light/dark; accessible titles, focus trapping, dismissal and overflow. Screenshots: output/modal-review");
} finally {
  await browser.close();
}
