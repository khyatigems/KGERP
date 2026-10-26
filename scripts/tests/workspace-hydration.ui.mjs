// Exercise the actual Next.js server-rendered workspace shell without a user account.
// Run against a local dev server: node scripts/tests/workspace-hydration.ui.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile, unlink, rmdir } from "node:fs/promises";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const route = `preview-hydration-review-${process.pid}`;
const directory = resolve("app", route);
const pageFile = resolve(directory, "page.tsx");
const base = process.env.ERP_REVIEW_URL || "http://localhost:3000";
await mkdir(directory);
let browser;
try {
  await writeFile(pageFile, `
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { SidebarGridClient } from '@/components/layout/sidebar-grid-client';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
export default async function Review({ searchParams }: { searchParams: Promise<{ collapsed?: string }> }) {
  const { collapsed } = await searchParams;
  return <SidebarProvider initialCollapsed={collapsed === '1'}><SidebarGridClient>
    <aside className="hidden lg:block"><Sidebar allowedModules={['ALL']} initialExpandedGroups={['overview', 'catalog']} /></aside>
    <div><Topbar user={{ name: 'Theme review', role: 'REVIEW' }} initialExpandedGroups={['overview', 'catalog']} /><main className="erp-workspace p-6">Hydration review</main></div>
  </SidebarGridClient></SidebarProvider>;
}
`);
  browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", message => { if (message.type() === "error") { errors.push(message.text()); console.error(message.text()); } });
  page.on("pageerror", error => { errors.push(error.message); console.error(error.message); });
  await page.setRequestInterception(true);
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      const path = new URL(request.url()).pathname;
      const data = path === "/api/auth/session" ? null : path === "/api/user/theme" ? { palette: "sapphire-facet" } : { items: [], unreadCount: 0, hasMore: false };
      void request.respond({ status: 200, contentType: "application/json", body: JSON.stringify(data) });
    } else void request.continue();
  });
  for (const collapsed of ["0", "1"]) {
    await page.setViewport({ width: 1280, height: 900 });
    const response = await page.goto(`${base}/${route}?collapsed=${collapsed}`, { waitUntil: "networkidle0", timeout: 120_000 });
    const serverHtml = response ? await response.text() : await (await fetch(`${base}/${route}?collapsed=${collapsed}`)).text();
    for (const attribute of ['aria-controls="workspace-appearance-desktop"', 'aria-controls="workspace-mobile-navigation"', 'id="workspace-profile-trigger"']) assert.ok(serverHtml.includes(attribute), `Server markup must contain ${attribute}`);
    // The Next dev-tools badge overlaps the bottom-left appearance button.
    await page.addStyleTag({ content: 'nextjs-portal { display:none!important; }' });
    await page.waitForSelector('[aria-label="Appearance settings"]:not([disabled])');
    const before = await page.$eval('[aria-label="Appearance settings"]', element => element.getAttribute('aria-controls'));
    await page.click('[aria-label="Appearance settings"]');
    await page.waitForSelector('[data-slot="popover-content"]');
    assert.equal(await page.$eval('[data-slot="popover-content"]', element => element.id), before);
    await page.keyboard.press("Escape");
    await page.click('#workspace-profile-trigger');
    await page.waitForSelector('#workspace-profile-menu');
    assert.equal(await page.$eval('#workspace-profile-menu', element => element.getAttribute('aria-labelledby')), 'workspace-profile-trigger');
    await page.keyboard.press("Escape");
    await page.setViewport({ width: 390, height: 844 });
    await page.click('[data-slot="sheet-trigger"]');
    await page.waitForSelector('[data-slot="sheet-content"]');
    const mobileControls = await page.$eval('[data-slot="sheet-trigger"]', element => element.getAttribute('aria-controls'));
    assert.equal(await page.$eval('[data-slot="sheet-content"]', element => element.id), mobileControls);
    const mobileAppearance = '[data-slot="sheet-content"] [aria-label="Appearance settings"]';
    assert.equal(await page.$eval(mobileAppearance, element => element.getAttribute('aria-controls')), 'workspace-appearance-mobile');
    await page.click(mobileAppearance);
    await page.waitForSelector('#workspace-appearance-mobile');
    await page.keyboard.press("Escape");
    await page.waitForSelector('#workspace-appearance-mobile', { hidden: true });
    await page.$eval('[data-slot="sheet-content"]', element => [...element.querySelectorAll('button')].find(button => button.textContent.trim() === 'Close').click());
    await page.waitForSelector('[data-slot="sheet-content"]', { hidden: true });
  }
  assert.deepEqual(errors.filter(error => /hydrat|didn't match|server rendered|Minified React error/i.test(error)), [], "Workspace shell must hydrate without mismatched attributes");
  console.log("Next.js workspace hydration and desktop/mobile control associations passed for expanded and collapsed sidebars");
} finally {
  await browser?.close();
  await unlink(pageFile).catch(() => {});
  await rmdir(directory);
}
