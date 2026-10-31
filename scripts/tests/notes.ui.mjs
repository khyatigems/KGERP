import assert from "node:assert/strict";
import { readFile, mkdir, readdir, mkdtemp } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";
import { unzipSync, strFromU8 } from "fflate";
const root = process.cwd(),
  out = resolve(root, "tmp/notes-review");
await mkdir(out, { recursive: true });
const bundle = await build({
  stdin: {
    contents: `
import React from 'react';import {createRoot} from 'react-dom/client';
import {NotesWorkspace} from './components/notes/notes-workspace';
import {QuickNotes} from './components/dashboard/quick-notes';
const now=new Date().toISOString();
window.notes=[{id:'legacy',title:'Gemstone photography master prompt',content:'Create a premium studio photograph of {{gemstone}}.\\nPreserve the natural colour, inclusions and precise facet geometry.\\nUse a soft neutral background and diffused lighting.',category:'Gemstone photography',kind:'Prompt',tags:'photography, studio',pinned:true,favorite:true,state:'active',uses:12,color:'yellow',attachments:[],createdBy:{name:'Khyati Gems'},createdAt:now,updatedAt:now}];
window.notes.push(...[
 {id:'orders',title:'Marketplace order tracking checklist',content:'When an order syncs from eBay, verify the carrier name and tracking number before marking it fulfilled.\\nCheck the invoice against the marketplace order to avoid duplicate entries.',category:'Operations',kind:'Checklist',tags:'ebay, orders',favorite:false},
 {id:'seo',title:'A better way to write gemstone listings',content:'Start with the gemstone, cut and carat weight. Add colour and origin only when verified. Keep the title readable and put the strongest search terms first.',category:'SEO & marketplaces',kind:'Documentation',tags:'seo, listings',favorite:true},
 {id:'template',title:'Customer follow-up message',content:'Hello {{customer}}, thank you for your interest in {{gemstone}}. I have attached the details and photographs for your review.',category:'General',kind:'Template',tags:'customers, email',favorite:false},
 {id:'strategy',title:'Ideas for the next collection',content:'Build a small collection around matched pairs. Photograph each pair together and individually. Prepare a consistent naming convention for the website and marketplaces.',category:'Business strategy',kind:'Note',tags:'collections',favorite:false}
].map(n=>({...window.notes[0],pinned:false,uses:0,...n})));
Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text;}}});
window.failSave=false;window.calls=[];
window.fetch=async(url,opts={})=>{
 window.calls.push({url,method:opts.method||'GET'});
 if(opts.method){if(window.failSave)return {ok:false,json:async()=>({error:'Offline — retry'})};const b=JSON.parse(opts.body||'{}');let n;
 if(opts.method==='POST'){n={...window.notes[0],...b,id:crypto.randomUUID(),title:b.title||'',pinned:false,favorite:false,uses:0,attachments:b.attachments||[]};window.notes.push(n);}
 else {n=window.notes.find(n=>n.id===b.id);Object.assign(n,b,{updatedAt:new Date().toISOString()});if(b.share)n.shareToken=crypto.randomUUID();}
 return {ok:true,json:async()=>JSON.parse(JSON.stringify(n))};}
 const id=new URL(String(url),location.origin).searchParams.get('id');return {ok:true,json:async()=>JSON.parse(JSON.stringify(id?window.notes.find(n=>n.id===id):window.notes))};
};
createRoot(document.getElementById('app')).render(<div className="erp-workspace min-h-screen lg:pl-60"><aside className="fixed inset-y-0 left-0 hidden w-60 border-r bg-card px-5 py-7 lg:block"><h2 className="text-lg font-semibold">Khyati Gems</h2><p className="mt-1 text-xs text-muted-foreground">Business workspace</p><nav className="mt-12 space-y-2 text-sm"><div className="p-3 text-muted-foreground">Business Overview</div><div className="rounded-lg bg-primary/10 p-3 font-medium text-primary">Notes</div><div className="p-3 text-muted-foreground">Inventory</div><div className="p-3 text-muted-foreground">Marketplaces</div><div className="p-3 text-muted-foreground">Sales & invoices</div></nav></aside><div className="mx-auto max-w-[1500px]"><NotesWorkspace/><div className="mx-6 mb-10 max-w-md" id="dashboard-widget"><QuickNotes/></div></div></div>);
`,
    loader: "tsx",
    resolveDir: root,
  },
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [
    {
      name: "stubs",
      setup(b) {
        b.onResolve({ filter: /^next\/link$/ }, (a) => ({
          path: a.path,
          namespace: "stub",
        }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
          resolveDir: root,
          loader: "tsx",
          contents: `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
        }));
      },
    },
  ],
  logLevel: "silent",
});
const styles = await postcss([tailwind()]).process(
  await readFile(resolve(root, "app/globals.css"), "utf8"),
  { from: resolve(root, "app/globals.css") },
);
const css =
  styles.css +
  (await readFile(resolve(root, "app/workspace-theme.css"), "utf8"));
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle.outputFiles[0].text);
  } else if (req.url === "/style.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="app"></div><script src="/bundle.js"></script></body></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
let browser;
try {
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewport({ width: 1500, height: 1000 });
  await page.goto(`http://127.0.0.1:${server.address().port}`, {
    waitUntil: "networkidle0",
  });
  const clickText = async (text) => {
    const found = await page.evaluate((text) => {
      const el = Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent.trim() === text,
      );
      el?.click();
      return !!el;
    }, text);
    assert.ok(found, `button ${text} exists`);
  };
  const clickMenuItem = async (text) => {
    await page.waitForSelector('[role="menuitem"]');
    const items = await page.$$('[role="menuitem"]');
    for (const item of items) {
      if (
        await item.evaluate((el, text) => el.textContent.trim() === text, text)
      ) {
        await item.click();
        await page.waitForSelector('[role="menu"]', { hidden: true });
        return;
      }
    }
    throw new Error("Menu item not found: " + text);
  };
  await page.waitForSelector("[data-note-card]");
  assert.equal(
    await page.$("[data-note-editor]"),
    null,
    "library opens without an empty editor",
  );
  assert.equal(
    await page.$('button[title="Quick note (Ctrl+Shift+N)"]'),
    null,
    "floating capture is removed",
  );
  assert.doesNotMatch(
    await readFile(resolve(root, "app/(dashboard)/layout.tsx"), "utf8"),
    /QuickCapture|quick-capture/,
  );
  await page.evaluate(
    () => (document.getElementById("dashboard-widget").hidden = true),
  );
  await page.screenshot({
    path: resolve(out, "library-light.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.workspaceTheme = "emerald-crystal";
    document.documentElement.dataset.workspaceMode = "dim";
  });
  await page.screenshot({
    path: resolve(out, "library-dim.png"),
    fullPage: true,
  });
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({
    path: resolve(out, "library-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "library fits a phone",
  );
  await page.setViewport({ width: 1500, height: 1000 });
  await page.type('input[aria-label="Search notes"]', "tracking");
  assert.equal(
    await page.$$eval("[data-note-card]", (els) => els.length),
    1,
    "search finds full content",
  );
  await page.click('button[aria-label="Clear search"]');
  await page.click('button[aria-label="List view"]');
  await page.screenshot({
    path: resolve(out, "library-list.png"),
    fullPage: true,
  });
  await page.click('button[aria-label="Card view"]');
  await page.click(
    'button[aria-label="Open Gemstone photography master prompt"]',
  );
  await page.waitForSelector('textarea[aria-label="Note content"]');
  await page.screenshot({ path: resolve(out, "desktop.png"), fullPage: true });
  await page.evaluate(
    () => (document.getElementById("dashboard-widget").hidden = false),
  );
  await page.type('input[placeholder="Enter gemstone"]', "Ruby");
  await clickText("Copy personalised prompt");
  await page.waitForFunction(() =>
    window.copied?.includes("photograph of Ruby"),
  );
  await page.click(
    '#dashboard-widget button[aria-label="Edit dashboard note"]',
  );
  await page.type(
    'textarea[aria-label="Dashboard note content"]',
    " WIDGET UPDATE",
  );
  await page.evaluate(() =>
    Array.from(document.querySelectorAll("#dashboard-widget button"))
      .find((b) => b.textContent === "Save")
      .click(),
  );
  await page.waitForFunction(() =>
    document
      .querySelector('textarea[aria-label="Note content"]')
      .value.includes("WIDGET UPDATE"),
  );

  await page.type('textarea[aria-label="Note content"]', " AUTOSAVE VERIFIED");
  await page.waitForFunction(() =>
    window.notes[0].content.includes("AUTOSAVE VERIFIED"),
  );
  await page.waitForFunction(() =>
    document
      .querySelector("#dashboard-widget")
      .textContent.includes("AUTOSAVE VERIFIED"),
  );
  await page.evaluate(() => (window.failSave = true));
  await page.type('textarea[aria-label="Note content"]', " RETAINED DRAFT");
  await page.waitForFunction(() =>
    document.body.textContent.includes("Save failed — retry"),
  );
  assert.ok(
    await page.$eval('textarea[aria-label="Note content"]', (e) =>
      e.value.includes("RETAINED DRAFT"),
    ),
  );
  await page.evaluate(() => (window.failSave = false));
  await clickText("Save failed — retry");
  await page.waitForFunction(() =>
    window.notes[0].content.includes("RETAINED DRAFT"),
  );
  await page.click('button[aria-label="Note actions"]');
  await clickMenuItem("Move to trash");
  await page.waitForFunction(() => window.notes[0].state === "trash");
  await page.waitForFunction(
    () =>
      !document
        .querySelector("#dashboard-widget")
        .textContent.includes("AUTOSAVE VERIFIED"),
  );
  await page.waitForSelector(
    'button[aria-label="Restore note"]:not([disabled])',
  );
  await page.click('button[aria-label="Restore note"]');
  await page.waitForFunction(() => window.notes[0].state === "active");
  const downloadDir = await mkdtemp(resolve(out, "downloads-"));
  const client = await page.createCDPSession();
  await client.send("Page.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: downloadDir,
  });
  const downloaded = async (extension) => {
    for (let i = 0; i < 100; i++) {
      const names = await readdir(downloadDir);
      const name = names.find((n) => n.endsWith(extension));
      if (name) return readFile(resolve(downloadDir, name));
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Export did not download: " + extension);
  };
  await page.waitForSelector(
    'button[aria-label="Download note"]:not([disabled])',
  );
  await page.click('button[aria-label="Download note"]');
  await page.waitForSelector('[role="menuitem"]');
  await clickMenuItem("DOCX");
  const docx = unzipSync(new Uint8Array(await downloaded(".docx")));
  assert.ok(
    strFromU8(docx["word/document.xml"]).includes("RETAINED DRAFT"),
    "DOCX contains the saved full content",
  );
  await page.waitForSelector(
    'button[aria-label="Download note"]:not([disabled])',
  );
  await page.click('button[aria-label="Download note"]');
  await page.waitForSelector('[role="menuitem"]');
  await clickMenuItem("TXT");
  assert.ok(
    (await downloaded(".txt")).toString("utf8").includes("RETAINED DRAFT"),
    "TXT contains saved full content",
  );
  await page.evaluate(
    () => (document.getElementById("dashboard-widget").hidden = true),
  );
  await page.setViewport({ width: 390, height: 844 });
  await page.screenshot({ path: resolve(out, "mobile.png"), fullPage: true });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
    "mobile has no horizontal overflow",
  );
  await page.setViewport({ width: 1500, height: 1000 });
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.screenshot({ path: resolve(out, "dark.png"), fullPage: true });
  await clickText("Back to notes");
  await page.waitForFunction(
    () => !document.querySelector("[data-note-editor]"),
  );
  assert.equal(
    await page.$$eval("[data-note-card]", (els) => els.length),
    5,
    "library remains intact after editing",
  );
  await page.click(
    'button[aria-label="Copy Marketplace order tracking checklist"]',
  );
  await page.waitForFunction(() =>
    window.copied?.includes("carrier name and tracking number"),
  );
  await page.waitForSelector(
    'button[aria-label="Favourite Marketplace order tracking checklist"]:not([disabled])',
  );
  await page.click(
    'button[aria-label="Favourite Marketplace order tracking checklist"]',
  );
  await page.waitForFunction(
    () => window.notes.find((n) => n.id === "orders").favorite === true,
  );
  await page.waitForSelector(
    'button[aria-label="Choose note type"]:not([disabled])',
  );
  await page.click('button[aria-label="Choose note type"]');
  await page.waitForSelector('[role="menuitem"]');
  await clickMenuItem("New template");
  await page.waitForSelector("[data-note-editor]");
  assert.equal(
    await page.$eval('button[aria-label="Note type"]', (el) => el.textContent),
    "Template",
    "new template opens the right editor",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Notes browser checks passed: library search/layouts, direct copy/favourite actions, focused editor, new templates, two-way dashboard synchronisation, autosave retry, exports and responsive themes. Screenshots: " +
      out,
  );
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
