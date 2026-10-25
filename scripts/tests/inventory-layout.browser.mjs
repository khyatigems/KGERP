import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";
import puppeteer from "puppeteer";

// Actual inventory UI with synthetic records. Router/server actions are isolated:
// this layout test never connects to, mutates, or exports the ERP database.
const fixture = `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {InventoryView,InventoryViewProvider,InventoryViewToggle} from './components/inventory/inventory-view';
import {InventoryStatsSummary} from './components/inventory/inventory-stats-summary';
import {InventorySearch} from './components/inventory/inventory-search';
import {WorkspaceHeader} from './components/layout/workspace-header';
import {Button} from './components/ui/button';
const masters = [{id:'c1',name:'Loose Gemstone'}];
const vendors = [{id:'v1',name:'Zahid Ali Gems'}];
const names = ['Zambian Emerald Lab Grown','Natural Blue Sapphire','Ruby with a longer inventory item name for readability','Emerald Bracelet'];
const items = Array.from({length:48},(_,index)=>({id:String(index),itemName:names[index%4],sku:'KGLGCSBYLW10000028'+index,category:index===3?'Bracelet':'Loose Gemstone',gemType:index===1?'Sapphire':'Emerald',weightValue:6,weightUnit:'cts',weightRatti:6.54,pricingMode:'PER_CARAT',sellingRatePerCarat:550,media:[],status:['IN_STOCK','SOLD','RESERVED','MEMO'][index%4],vendorId:'v1',createdAt:'2026-10-06',certificates:[],certification:''}));
const stats={overallTotalItems:298,totalItems:298,totalSell:1689442.69,avgSell:5669.27,maxSell:27750,withImagesCount:252,withCertificateCount:240,aging:{fresh:120,slow:80,dead:29},byCategory:[{category:'Loose Gemstone'}],byGemType:[{gemType:'Sapphire'}],overallByStatus:[{status:'IN_STOCK',items:229},{status:'SOLD',items:69}]};
createRoot(document.getElementById('root')).render(<InventoryViewProvider><main className="inventory-page min-w-0 space-y-4"><WorkspaceHeader className="inventory-header" eyebrow="KhyatiGems · Inventory & catalog"><div className="space-y-3"><div className="inventory-heading-row"><div><h1>Inventory</h1><p>Manage your inventory items</p></div><InventoryViewToggle /></div><div className="inventory-header-actions"><Button variant="outline">Import</Button><Button>Add Item</Button><details className="inventory-tools"><summary>Exports & tools</summary><div className="inventory-tools-content"><Button>Export Summary</Button><Button>Complete Export</Button></div></details></div></div></WorkspaceHeader><InventoryStatsSummary data={stats}/><div className="rounded-2xl border bg-card p-3"><InventorySearch vendors={vendors} categories={masters} gemstones={[{id:'g1',name:'Emerald'}]} colors={[]} collections={[]} rashis={[]}/></div><InventoryView data={items} vendors={vendors} categories={masters} gemstones={[]} colors={[]} collections={[]} rashis={[]} certificates={[]}/></main></InventoryViewProvider>);
`;
const mocks = {
  navigation: `import {useMemo,useSyncExternalStore} from 'react'; let url=''; const subscribe=(cb)=>{window.addEventListener('fixture-route',cb);return()=>window.removeEventListener('fixture-route',cb)}; const navigate=(next)=>{url=next.split('?')[1]||'';window.fixtureQuery=url;window.dispatchEvent(new Event('fixture-route'));}; export const usePathname=()=>'/inventory'; export const useRouter=()=>({push:navigate,replace:navigate,refresh:()=>{}}); export function useSearchParams(){const value=useSyncExternalStore(subscribe,()=>url,()=>url);return useMemo(()=>new URLSearchParams(value),[value]);}`,
  link: `import React from 'react'; export default function Link({children,prefetch,...props}){return <a {...props}>{children}</a>}`,
  image: `import React from 'react'; export default function Image({fill,priority,sizes,...props}){return <div role="img" aria-label={props.alt} style={{width:'100%',height:'100%',display:'grid',placeItems:'center',background:'#153631',color:'#64bc9e',fontSize:22}}>◇</div>}`,
  loader: `export const useGlobalLoader=()=>({showLoader:()=>{},hideLoader:()=>{}});`,
  dynamic: `import React from 'react'; export default function dynamic(){return (props)=>props.itemName?<button type="button" aria-label="QR code" style={{width:32,height:32}}>▦</button>:null;}`,
  actions: `export async function updateInventoryStatus(){return {success:true}}`,
  dialogs: `export const BulkEditDialog=()=>null; export const BulkCertificateDialog=()=>null; export const RegenerateEbayButton=()=>null; export const RegenerateEtsyButton=()=>null;`,
  empty: `export {};`,
};
const bundle = await build({ stdin: { contents: fixture, resolveDir: process.cwd(), loader: "tsx" }, bundle: true, write: false, platform: "browser", jsx: "automatic", define: { "process.env.NODE_ENV": '"development"' }, plugins: [{ name: "isolated-layout-fixture", setup(build) {
  build.onResolve({ filter: /^next\/(navigation|link|image|dynamic)$/ }, ({ path }) => ({ path: path.split("/")[1], namespace: "fixture" }));
  build.onResolve({ filter: /components\/global-loader-provider$/ }, () => ({ path: "loader", namespace: "fixture" }));
  build.onResolve({ filter: /app\/\(dashboard\)\/inventory\/actions$/ }, () => ({ path: "actions", namespace: "fixture" }));
  build.onResolve({ filter: /(?:bulk-edit-dialog|bulk-certificate-dialog|regenerate-ebay-button)$/ }, () => ({ path: "dialogs", namespace: "fixture" }));
  build.onResolve({ filter: /(?:inventory-qr|packaging-print-dialog|label-print-dialog|inventory-detail-drawer)$/ }, () => ({ path: "empty", namespace: "fixture" }));
  build.onLoad({ filter: /.*/, namespace: "fixture" }, ({ path }) => ({ contents: mocks[path], loader: "tsx", resolveDir: process.cwd() }));
} }] });
const css = await postcss([tailwind()]).process(await readFile("app/globals.css", "utf8"), { from: "app/globals.css" });
const inventoryCss = await readFile("components/inventory/inventory-layout.css", "utf8");
await mkdir("output/inventory-review", { recursive: true });
assert.match(await readFile("app/(dashboard)/inventory/page.tsx", "utf8"), /const ITEMS_PER_PAGE = 48;/);
const browser = await puppeteer.launch({ headless: true });
try {
  for (const width of (process.env.INVENTORY_QA_WIDTH ? [Number(process.env.INVENTORY_QA_WIDTH)] : [320, 390, 768, 1024, 1440])) for (const theme of ["light", "dark"]) {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewport({ width, height: 1000 });
    await page.setContent(`<!doctype html><html class="${theme === "dark" ? "dark" : ""}"><head><style>${css.css}\n${inventoryCss}\nbody{padding:16px;background:var(--background);color:var(--foreground)} @media(min-width:1024px){body{padding-left:230px}} main{max-width:1400px;margin:auto}</style></head><body><div id="root"></div></body></html>`);
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.waitForSelector(width < 768 ? ".inventory-compact-item" : ".inventory-items-table");
    await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState === "finished" || animation.effect.getTiming().iterations === Infinity));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `Page overflow at ${width}/${theme}`);
    assert.equal(await page.$$(".inventory-stat-card").then((cards) => cards.length), 4);
    if (width >= 768) {
      const table = await page.$eval(".inventory-items-table", (table) => ({ overflow: table.scrollWidth > table.parentElement.clientWidth + 1, headers: [...table.querySelectorAll("th")].map((cell) => cell.textContent) }));
      assert.equal(table.overflow, false, `Table needs scrolling at ${width}`);
      assert.ok(!table.headers.some((text) => ["Color", "Cut", "Location"].includes(text)));
      assert.ok(await page.$('.inventory-actions-col button'));
    } else {
      assert.equal(await page.$(".inventory-items-table"), null, "Mobile must mount only the card list");
      const height = await page.$eval(".inventory-compact-item", (item) => item.getBoundingClientRect().height);
      assert.ok(height < 180, `Mobile card too tall: ${height}`);
      await page.click('button[aria-label="Filter inventory"]');
      await page.waitForSelector('[data-slot="sheet-content"]');
      assert.ok(await page.$('[data-slot="sheet-title"]'));
      await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState === "finished" || animation.effect.getTiming().iterations === Infinity));
      await page.screenshot({ path: `output/inventory-review/filters-${theme}-${width}.png` });
      await page.click('[data-slot="sheet-content"] button[role="combobox"]');
      await page.waitForSelector('[cmdk-item]');
      await page.click('[cmdk-item]');
      const buttons = await page.$$('[data-slot="popover-content"] button');
      for (const button of buttons) if (await button.evaluate((element) => element.textContent.trim() === "Apply")) { await button.click(); break; }
      await page.waitForFunction(() => new URLSearchParams(window.fixtureQuery).get("category") === "Loose Gemstone");
      await page.waitForSelector('[data-slot="popover-content"]', { hidden: true });
      await page.keyboard.press("Escape");
      await page.waitForSelector('[data-slot="sheet-content"]', { hidden: true });
      await page.click('button[aria-label="Remove Category: Loose Gemstone filter"]');
      await page.waitForFunction(() => !new URLSearchParams(window.fixtureQuery).has("category"));
    }
    await page.screenshot({ path: `output/inventory-review/inventory-${theme}-${width}.png`, fullPage: false });
    await (await page.$$(".inventory-filter-status button"))[2].click();
    await page.waitForFunction(() => new URLSearchParams(window.fixtureQuery).get("status") === "SOLD");
    await page.type('input[aria-label="Search inventory"]', "Emerald");
    await page.waitForFunction(() => new URLSearchParams(window.fixtureQuery).get("query") === "Emerald");
    await page.click('button[aria-label="Clear all inventory filters"]');
    await page.waitForFunction(() => window.fixtureQuery === "");
    assert.equal(await page.$eval('input[aria-label="Search inventory"]', (element) => element.value), "");
    if (width >= 768) await page.click('button[title="Card view"]');
    await page.waitForSelector(".inventory-compact-item");
    const grid = await page.$eval(".inventory-compact-list", (element) => ({ columns: getComputedStyle(element).gridTemplateColumns.split(" ").length, items: element.querySelectorAll("article").length }));
    assert.equal(grid.items, 48);
    assert.equal(grid.items % grid.columns, 0, "Full card page must have no unfilled row slots");
    const checks = await page.$$(".inventory-compact-item [role=checkbox]");
    await checks[0].click();
    await checks[1].click();
    assert.equal(await page.$$('[data-selected="true"]').then((items) => items.length), 2);
    assert.ok(await page.$('[aria-label="Inventory bulk actions"]'));
    if (width >= 768) {
      await page.click('button[title="Table view"]');
      assert.equal(await page.$$('.inventory-items-table tbody [role="checkbox"][aria-checked="true"]').then((items) => items.length), 2, "Selection must survive view changes");
      await page.click('button[title="Card view"]');
    }
    await page.click('button[aria-label="Bulk edit selected inventory"]');
    await page.waitForFunction(() => new URLSearchParams(window.fixtureQuery).getAll("id").length === 2);
    await page.click('button[aria-label="Select all items on this page"]');
    assert.equal(await page.$$('[data-selected="true"]').then((items) => items.length), 48);
    await (await page.$$(".inventory-compact-item [role=checkbox]"))[0].click();
    assert.equal(await page.$eval('[aria-label="Select all items on this page"]', (element) => element.getAttribute("aria-checked")), "mixed");
    await page.click('button[aria-label="Clear inventory selection"]');
    assert.equal(await page.$$('[data-selected="true"]').then((items) => items.length), 0);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Inventory layout checks passed: 320/390/768/1024/1440px, light/dark, no page/table overflow, 4 stats, compact mobile cards, mobile filter sheet, full card rows, multi-select, selection across views and bulk-edit IDs. Screenshots: output/inventory-review");
} finally { await browser.close(); }
