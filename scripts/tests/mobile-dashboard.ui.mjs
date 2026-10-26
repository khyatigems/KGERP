// Run against a local Next dev server; all dashboard APIs are mocked in the browser.
import assert from "node:assert/strict";
import { mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const fixture = {
  updatedAt: "2026-10-26T06:30:00Z", period: "October 2026",
  access: { inventory: true, listings: true, sales: true, customers: true, activity: true, teamActivity: true }, unavailable: [],
  inventory: { total: 229, listed: 172, unlisted: 57, preparedUnlisted: 57, gemstones: [{ name: "Sapphire", count: 120 }, { name: "Emerald", count: 69 }, { name: "Ruby", count: 40 }] },
  marketplace: { total: 243, shops: [{ id: "ebay", platform: "EBAY", name: "Khyati Gems eBay", connected: true, active: 142, drafts: 12, errors: 0, lastSyncedAt: "2026-10-26T06:00:00Z" }, { id: "etsy", platform: "ETSY", name: "Khyati Gems Etsy", connected: false, active: 101, drafts: 4, errors: 2, lastSyncedAt: null }] },
  invoices: { total: 24, export: 18, tax: 6, other: 0, unpaid: 3, recent: [{ id: "one", number: "INV-1042", type: "EXPORT", currency: "USD", amount: 250, inrAmount: 20000, paymentStatus: "PAID", customer: "Gemstone Trading Company", country: "US" }, { id: "two", number: "INV-1043", type: "TAX", currency: "INR", amount: 48000, inrAmount: 48000, paymentStatus: "UNPAID", customer: "Emerald Collections", country: "IN" }] },
  customers: { new: 12, returningBuyers: 8 },
  activity: [{ id: "a", actorId: "user", actor: "Review user", role: "ADMIN", action: "UPDATE", entity: "Inventory", reference: "GEM-1042", createdAt: "2026-10-26T06:15:00Z", changes: [{ field: "status", before: "DRAFT", after: "IN_STOCK" }] }],
};
const route = `preview-mobile-dashboard-${process.pid}`;
const directory = resolve("app", route);
const pageFile = resolve(directory, "page.tsx");
const output = resolve("tmp/mobile-dashboard-review");
await mkdir(output, { recursive: true });
await mkdir(directory);
let browser;
try {
  await writeFile(pageFile, `
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { SidebarGridClient } from '@/components/layout/sidebar-grid-client';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { TradingDashboard } from '@/components/dashboard/trading-dashboard';
import type { TradingDashboardData } from '@/lib/trading-dashboard-types';
export default async function Review({ searchParams }: { searchParams: Promise<{ restricted?: string; unavailable?: string }> }) {
  const params = await searchParams;
  const data: TradingDashboardData = ${JSON.stringify(fixture)};
  if (params.restricted) { data.access = { inventory:true, listings:false, sales:false, customers:false, activity:false, teamActivity:false }; data.inventory!.listed=null; data.inventory!.preparedUnlisted=null; data.marketplace=null;data.invoices=null;data.customers=null;data.activity=[]; }
  if (params.unavailable) { data.inventory=null;data.marketplace=null;data.invoices=null;data.activity=[];data.unavailable=['inventory','marketplace','invoices','activity']; }
  return <SidebarProvider><SidebarGridClient><aside className="hidden lg:block"><Sidebar /></aside><div className="flex min-w-0 flex-col"><Topbar user={{name:'Review user',role:'REVIEW'}}/><main className="erp-workspace min-w-0 flex-1 bg-background p-4 lg:p-6"><TradingDashboard userId="mobile-review" initialData={data}/></main></div></SidebarGridClient></SidebarProvider>;
}`);
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const issues = [];
  page.on("console", message => { if (["error", "warn"].includes(message.type()) && /hydrat|width or height modified|either width|server rendered/i.test(message.text())) issues.push(message.text()); });
  page.on("pageerror", error => issues.push(error.message));
  await page.setRequestInterception(true);
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/')) {
      let data = { items: [], unreadCount: 0, hasMore: false };
      if (path === '/api/auth/session') data = null;
      else if (path === '/api/user/theme') data = { palette: 'sapphire-facet' };
      else if (path === '/api/dashboard/trading') data = { ...fixture, inventory: { ...fixture.inventory, total: 230 } };
      void request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    } else void request.continue();
  });
  const base = process.env.ERP_REVIEW_URL || 'http://localhost:3000';
  const navigate = async (query = '') => {
    await page.goto(`${base}/${route}${query}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('[data-testid="mobile-trading-dashboard"]');
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  };
  const click = label => page.$eval('[data-testid="mobile-trading-dashboard"]', (root, text) => {
    const button = [...root.querySelectorAll('button')].find(button => button.textContent.trim() === text);
    if (!button) throw Error(`Missing mobile control: ${text}`);
    button.click();
  }, label);
  for (const width of [320, 390, 430]) {
    await page.setViewport({ width, height: 844 });
    await navigate();
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No page overflow at ${width}px`);
    const metrics = await page.$$eval('.mobile-dashboard-metric', elements => elements.map(element => ({ x: element.getBoundingClientRect().x, y: element.getBoundingClientRect().y, height: element.getBoundingClientRect().height })));
    assert.equal(metrics.length, 4);
    assert.equal(metrics[0].y, metrics[1].y, 'Summary must use two columns');
    assert.ok(metrics.every(metric => metric.height < 110), 'Summary cards must remain compact');
    assert.ok(await page.$eval('[data-testid="desktop-trading-dashboard"]', el => getComputedStyle(el).display === 'none'));
    await page.screenshot({ path: resolve(output, `mobile-${width}.png`) });
  }
  await click('Stock');
  await page.waitForSelector('section[aria-label="Gemstone stock"]');
  await click('Channels');
  await page.waitForSelector('section[aria-label="Marketplace channels"]');
  await page.screenshot({ path: resolve(output, 'mobile-channels.png') });
  await click('Invoices'); await click('Tax');
  assert.ok(await page.$eval('section[aria-label="Recent invoices"]', el => el.textContent.includes('INV-1043') && !el.textContent.includes('INV-1042')));
  await click('Activity');
  await page.click('[data-testid="mobile-trading-dashboard"] section[aria-label="Recent activity"] button');
  await page.waitForSelector('[role="dialog"]');
  assert.ok(await page.$eval('[role="dialog"]', el => el.textContent.includes('GEM-1042') && el.textContent.includes('DRAFT')));
  await page.keyboard.press('Escape');
  await page.waitForSelector('[role="dialog"]', { hidden: true });
  await click('Overview');
  await click('Refresh');
  await page.waitForFunction(() => document.querySelector('.mobile-dashboard-metric strong')?.textContent === '230');
  await page.evaluate(() => { document.documentElement.dataset.textSize='large'; });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'Large text must not overflow');
  await page.screenshot({ path: resolve(output, 'mobile-large-text.png') });
  await page.setViewport({ width: 1280, height: 900 });
  await navigate();
  assert.ok(await page.$eval('[data-testid="desktop-trading-dashboard"]', el => getComputedStyle(el).display !== 'none'));
  await page.screenshot({ path: resolve(output, 'desktop.png') });
  await page.setViewport({ width: 390, height: 844 });
  await navigate('?restricted=1');
  assert.deepEqual(await page.$$eval('[aria-label="Dashboard sections"] button', elements => elements.map(el => el.textContent)), ['Overview', 'Stock']);
  assert.equal(await page.$$('section[aria-label="Marketplace channels"]').then(elements => elements.length), 0);
  await navigate('?unavailable=1');
  assert.ok(await page.$eval('[data-testid="mobile-trading-dashboard"] [role="alert"]', el => el.textContent.includes('unavailable')));
  await click('Stock');
  assert.ok(await page.$eval('section[aria-label="Gemstone stock"]', el => el.textContent.includes('temporarily unavailable')));
  assert.deepEqual(issues, []);
  console.log(`Mobile dashboard layout (320/390/430px), desktop preservation, refresh, invoice filters, activity details, permissions, unavailable data and logo warnings passed. Screenshots: ${output}`);
} finally {
  await browser?.close();
  await unlink(pageFile).catch(() => {});
  await rmdir(directory);
}
