import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";
import { escapeHtml as h, percentChange, type ReportSettings } from "./config";
import type { Metrics } from "./metrics";

const company = "Khyati Precious Gems Private Limited";
export function sanitizeLogoSvg(svg: string) {
 if (!/<svg[\s>]/i.test(svg) || /<!DOCTYPE|<!ENTITY|<script|<foreignObject|(?:href|xlink:href)\s*=|url\(\s*(?!#)/i.test(svg)) throw new Error("Company logo SVG contains unsupported or external content");
 const cleaned = sanitizeHtml(svg, { allowedTags: ["svg", "g", "path", "rect", "circle", "ellipse", "polygon", "polyline", "line", "defs", "linearGradient", "stop"], allowedAttributes: { "*": ["xmlns", "viewBox", "width", "height", "d", "fill", "stroke", "stroke-width", "transform", "x", "y", "cx", "cy", "r", "rx", "ry", "points", "id", "offset", "stop-color", "opacity", "x1", "x2", "y1", "y2"] }, parser: { lowerCaseTags: false, lowerCaseAttributeNames: false } });
 if (!cleaned.includes("<svg") || !/<(?:path|rect|circle|ellipse|polygon|polyline|line)[\s>]/.test(cleaned)) throw new Error("Company logo SVG has no supported artwork");
 return cleaned;
}
export const money = (values: Record<string, number>) => Object.entries(values).map(([c, n]) => new Intl.NumberFormat("en-IN", { style: "currency", currency: c }).format(n)).join(" · ") || "Unavailable";
const percent = (value: number | null | undefined) => value == null ? "N/A" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
const changeSummary = (shop: Metrics["shops"][number]) => shop.orderDataAvailable ? `Orders ${percent(shop.orderChange)} · Units ${percent(shop.unitChange)} · ${Object.entries(shop.revenueChange).map(([currency, change]) => `${currency} ${percent(change)}`).join(" · ") || "Value N/A"}` : "N/A · order sync incomplete";
const timestamp = (value: string | null, timezone: string) => value ? new Intl.DateTimeFormat("en-IN", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "No sync recorded";
const orderSyncLabel = (state: string) => ({ CURRENT: "Complete after period end", STALE: "Before period end", NO_SYNC: "No completed order sync", IN_PROGRESS: "In progress", PARTIAL: "Partial / failed records", FAILED: "Failed", DISCONNECTED: "Disconnected" }[state] || "Unavailable");
export function bars(title: string, rows: Array<[string, number]>, color = "#168879") {
 const max = Math.max(1, ...rows.map(r => r[1]));
 return `<div class="chart"><h3>${h(title)}</h3><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 620 ${Math.max(55, rows.length * 29 + 12)}" role="img" aria-label="${h(title)}">${rows.map(([label, n], i) => `<text x="0" y="${i * 29 + 20}" font-size="12" fill="#334155">${h(label.slice(0, 27))}</text><rect x="200" y="${i * 29 + 5}" width="${Math.max(0, n) / max * 330}" height="19" rx="3" fill="${color}"/><text x="${210 + Math.max(0, n) / max * 330}" y="${i * 29 + 20}" font-size="12" fill="#334155">${h(Number(n.toFixed(2)))}</text>`).join("")}${!rows.length ? '<text x="0" y="30" font-size="13">No covered data in this period</text>' : ""}</svg></div>`;
}
const table = (headers: string[], rows: unknown[][]) => `<table><thead><tr>${headers.map(x => `<th>${h(x)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map(row => `<tr>${row.map(x => `<td>${h(x)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${headers.length}">No covered records in this period.</td></tr>`}</tbody></table>`;
/** Count-based briefing: no product/SKU registers and no repeated full-size sections. */
export function reportHtml(m: Metrics, s: ReportSettings, logo: string, font: string, mode: string) {
 const enabled = (...keys: (keyof ReportSettings["sections"])[]) => keys.some(key => s.sections[key]);
 const tableRows = (headers: string[], rows: unknown[][]) => table(headers, rows);
 const section = (title: string, body: string) => `<section><h2>${h(title)}</h2>${body}</section>`;
 const na = "Unavailable";
 const complete = m.orderCoverage.complete;
 const revenueComplete = m.revenueAvailable ?? (complete && !m.current.unknownAmounts);
 const compare = s.comparisons && s.sections.comparisons && m.previous;
 const erp = m.erpInvoices?.current, priorErp = m.erpInvoices?.previous;
 const previousValue = (value: unknown) => compare ? value ?? na : undefined;
 const comparisonHeaders = ["Metric", "This week", ...(compare ? ["Last week", "Change"] : [])];
 const comparisonRow = (name: string, current: number | string, prior: number | string | null | undefined, change: number | null) => [name, current, ...(compare ? [previousValue(prior), percent(change)] : [])];
 const currencies = [...new Set([...Object.keys(m.current.totals), ...Object.keys(m.previous?.totals || {})])].sort();
 const salesRows: unknown[][] = [];
 if (enabled("orders", "comparisons")) salesRows.push(comparisonRow("Marketplace orders", complete ? m.current.count : na, complete ? m.previous?.count : na, m.comparisons?.orders ?? null), comparisonRow("Marketplace units (eligible statuses)", complete ? m.current.units : na, complete ? m.previous?.units : na, m.comparisons?.units ?? null));
 if (s.sections.revenue) {
  for (const currency of currencies) salesRows.push(comparisonRow(`Marketplace recorded value - ${currency}`, revenueComplete ? money({ [currency]: m.current.totals[currency] || 0 }) : na, (m.revenueComparisonAvailable ?? complete) ? money({ [currency]: m.previous?.totals[currency] || 0 }) : na, m.comparisons?.revenue[currency] ?? null));
  if (!currencies.length) salesRows.push(comparisonRow("Marketplace recorded value", complete ? "No recorded value" : na, na, null));
 }
 if (s.sections.listings) salesRows.push(comparisonRow("Verified ERP eBay publications (partial)", m.newListings.length, m.previousPublished, m.comparisons?.newListings ?? null));
 if (s.sections.orders) salesRows.push(comparisonRow("ERP issued invoices", erp?.count ?? na, priorErp?.count, erp && priorErp ? percentChange(erp.count, priorErp.count) : null));
 if (s.sections.revenue) salesRows.push(comparisonRow("ERP invoice value - INR (separate ledger)", erp ? money({ INR: erp.recordedValueInr }) : na, priorErp ? money({ INR: priorErp.recordedValueInr }) : na, erp && priorErp ? percentChange(erp.recordedValueInr, priorErp.recordedValueInr) : null));
 const inventoryRows: unknown[][] = [];
 if (enabled("inventory", "availability")) inventoryRows.push(["Unique physical SKUs", m.inventory.physicalSkus], ...Object.entries(m.inventory.byStatus).map(([status, count]) => [status.replaceAll("_", " "), count]), ["Distinct SKUs sold in period (ERP)", m.soldPhysicalSkus], ["ERP sale rows in period", m.erpSaleRows]);
 if (enabled("completeness")) inventoryRows.push(["Incomplete SKUs / physical inventory", `${m.inventory.incomplete} / ${m.inventory.physicalSkus} (${m.inventory.incompletePercent.toFixed(1)}%)`]);
 if (s.sections.images) inventoryRows.push(["Missing images", `${m.inventory.missingFields.Image || 0} (${m.inventory.physicalSkus ? ((m.inventory.missingFields.Image || 0) / m.inventory.physicalSkus * 100).toFixed(1) : "0.0"}%)`]);
 if (s.sections.certificates) inventoryRows.push(["Missing certificate numbers / eligible stock", `${m.inventory.missingFields["Certificate number"] || 0} / ${m.inventory.certificateEligible} (${m.inventory.certificateEligible ? ((m.inventory.missingFields["Certificate number"] || 0) / m.inventory.certificateEligible * 100).toFixed(1) : "0.0"}%)`]);
 if (s.sections.requiredFields) for (const field of s.requiredFields) inventoryRows.push([`Missing required field: ${field}`, m.inventory.missingFields[field] || 0]);
 if (s.valuation && s.sections.inventory) inventoryRows.push(["In-stock cost value / asking value (INR)", `${money({ INR: m.inventory.costValuation || 0 })} / ${money({ INR: m.inventory.askingValuation || 0 })}`]);
 const operations: unknown[][] = [];
 if (s.sections.orders) operations.push(["ERP export / tax / other invoices", erp ? `${erp.export} / ${erp.tax} / ${erp.count - erp.export - erp.tax}` : na], ["Invoices issued this week still unpaid", erp?.unpaid ?? na]);
 if (s.sections.refunds) operations.push(["Recognized marketplace cancelled / refunded orders", complete ? `${m.current.cancelled} / ${m.current.refunded}` : na], ["ERP return records / units", `${m.erpReturns.records ?? na} / ${m.erpReturns.units ?? na}`]);
 if (s.sections.sync && s.syncHealth) operations.push(["Shops connected / configured", `${m.shops.filter(x => x.connected).length} / ${m.shops.length}`], ["Shops with current order coverage", `${m.orderCoverage.coveredShops} / ${m.orderCoverage.totalShops}`], ["Failed / partial sync logs in period", m.shops.reduce((sum, x) => sum + x.failedSyncs, 0)], ["Listing error records now", m.shops.reduce((sum, x) => sum + x.failedListingRecords, 0)]);
 operations.push(["Invalid inventory price / piece-count records", m.inventory.inconsistencies]);
 const cards = [["In-stock SKUs now", m.inventory.inStock], ["Orders this week", complete ? m.current.count : na], ["ERP invoices this week", erp?.count ?? na], ["Verified publications*", m.newListings.length], ["Incomplete SKUs now", m.inventory.incomplete], ["Critical / warning alerts", `${m.alerts.filter(x => x.severity === "CRITICAL").length} / ${m.alerts.filter(x => x.severity === "WARNING").length}`]];
 const shopRows = m.shops.map(x => [x.name + " / " + x.platform, `${x.activeListings}${x.listingStale ? " (stale)" : ""}`, x.newListings ?? na, x.orderDataAvailable ? `${x.orders} / ${x.units}` : na, (x.revenueDataAvailable ?? x.orderDataAvailable) ? Object.keys(x.value).length ? money(x.value) : "No recorded value" : na, compare ? changeSummary(x) : x.connected ? "Connected" : "Disconnected"]);
 const charts: string[] = [];
 if (s.charts && s.sections.marketplaces) charts.push(bars("Active listings now by shop", m.shops.map(x => [x.name, x.activeListings])));
 if (s.charts && enabled("completeness", "images", "requiredFields")) charts.push(bars("Inventory quality - affected physical SKUs", [["Complete", m.inventory.physicalSkus - m.inventory.incomplete], ...Object.entries(m.inventory.missingFields)], "#b89555"));
 if (s.charts && s.sections.revenue && revenueComplete) for (const currency of currencies) charts.push(bars(`Daily marketplace recorded value (${currency})`, Array.from({ length: 7 }, (_, i) => { const day = new Date(+new Date(m.period.startDay + "T12:00:00Z") + i * 86400000).toISOString().slice(0, 10); return [day.slice(5), m.current.daily[day]?.[currency] || 0] as [string, number]; })));
 const quality = !complete ? `Order coverage incomplete: ${m.orderCoverage.coveredShops}/${m.orderCoverage.totalShops} shops. ${m.orderCoverage.unavailableShops.map(x => `${x.name}: ${orderSyncLabel(x.state)}`).join("; ")}. Sync orders before interpreting sales or percentage changes.` : m.current.unknownAmounts ? `${m.current.unknownAmounts} eligible orders have invalid amounts/currencies; financial totals and comparisons are unavailable.` : "Order sync coverage is current for all selected shops.";
 const notes = ["Week totals use inclusive start / exclusive end in the report timezone. Orders: source orderDate; ERP sales: saleDate; invoices: invoiceDate (createdAt fallback). Percent change = (this week - last week) / last week; N/A if last week is zero or coverage is incomplete.", "Inventory and active listings are current snapshots, not historical week-end stock. No invented prior-week inventory percentages. Physical SKUs count once across marketplaces. Image checks require a populated image reference; certificate counts follow Inventory > Missing Certification (in-stock with an image/media reference, both certificate identifiers null/empty).", "*New publications count verified ERP eBay workPublication markers only. Etsy/import creation dates are not evidence of first publication. Failed publication attempts and comprehensive refund values are unavailable.", "Marketplace values stay in original currency and may include shipping/tax; known cancelled, refunded, failed and unpaid statuses are excluded from units/value. Net sales, settlements and historical FX are unavailable. ERP invoice amounts are stored INR totals and are a separate ledger; never add them to marketplace revenue."];
 return `<!doctype html><html><head><meta charset="utf-8"><style>
 @font-face{font-family:Report;src:url(data:font/ttf;base64,${font})}*{box-sizing:border-box}body{font-family:Report,Arial,sans-serif;font-size:9px;line-height:1.4;color:#25364a;background:#fff;color-scheme:light;margin:0}header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #b89555;padding-bottom:12px;margin-bottom:14px}header img{width:130px;height:53px;object-fit:contain;object-position:left}header .heading{text-align:right}.eyebrow{color:#168879;letter-spacing:1px;text-transform:uppercase;font-size:8px}h1{font-size:20px;line-height:1.2;color:#102b45;margin:6px 0}h2{font-size:13px;color:#102b45;border-bottom:1px solid #d7e1e7;padding:6px 0;margin:12px 0 6px;break-after:avoid}h3{font-size:10px;margin:0 0 8px}section{margin:10px 0}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.card{background:#f0f5f6;border-top:2px solid #168879;padding:8px;break-inside:avoid}.number{font-size:20px;font-weight:bold;color:#102b45}.notice{padding:8px;background:#fff6e6;border-left:3px solid #b89555;margin:8px 0;break-inside:avoid}table{width:100%;border-collapse:collapse;margin:6px 0;font-size:8px;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th{background:#102b45;color:white;text-align:left}td,th{padding:5px;border-bottom:1px solid #dfe7ea;overflow-wrap:anywhere;vertical-align:top}tbody tr:nth-child(even){background:#f5f8fa}.columns,.charts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.columns>div{min-width:0}.chart{break-inside:avoid;border:1px solid #dfe7ea;padding:9px;margin:6px 0}svg{width:100%;height:auto}.muted{color:#64748b}.notes{font-size:7.5px}.notes p{margin:5px 0}p{margin:6px 0}.alert-list{padding-left:16px}.alert-list li{margin:5px 0}
 </style></head><body><header><img src="${logo}" alt="Khyati Gems"><div class="heading"><div class="eyebrow">Weekly business briefing${mode === "TEST" ? " / TEST EMAIL" : mode.includes("SYNTHETIC") ? " / SYNTHETIC QA" : mode === "PREVIEW" ? " / Preview - live ERP data" : ""}</div><h1>${h(s.name)}</h1><strong>${company}</strong><p>${h(m.period.startDay)} - ${h(m.period.endDay)} | ${h(m.period.timezone)}</p></div></header>
 <p class="muted">Generated ${h(timestamp(m.generatedAt, m.period.timezone))} | Data coverage: ${h(m.dataQuality)}</p>
 ${s.sections.executive ? `<div class="cards">${cards.map(([title, value]) => `<div class="card">${h(title)}<div class="number">${h(value)}</div></div>`).join("")}</div>` : ""}
 ${enabled("orders", "marketplaces", "revenue", "coverage") ? `<div class="notice">${h(quality)}</div>` : ""}
 ${salesRows.length ? section("Weekly performance", tableRows(comparisonHeaders, salesRows)) : ""}
 ${s.sections.marketplaces ? section("Marketplace and shop performance", tableRows(["Shop / platform", "Active listings now", "New publications*", "Orders / units", "Recorded order value", compare ? "Change vs previous week" : "Connection"], shopRows)) : ""}
 <div class="columns"><div>${inventoryRows.length ? section("Inventory and completeness - now", tableRows(["Measure", "Count / value"], inventoryRows)) : ""}</div><div>${operations.length ? section("Operations and checks", tableRows(["Measure", "Count"], operations)) : ""}${s.sections.inventory ? section("Stock by gemstone - all statuses", `<p class="muted">${Object.entries(m.inventory.byGemstone).sort((a,b) => b[1]-a[1]).map(([name,count]) => `${h(name)}: <strong>${count}</strong>`).join(" &nbsp; | &nbsp; ")}</p>`) : ""}</div></div>
 ${s.syncHealth && s.sections.sync ? section("Synchronization checkpoints", tableRows(["Shop", "Last listing sync", "Last order sync", "Period coverage"], m.shops.map(x => [x.name, timestamp(x.lastListingSyncAt, m.period.timezone), timestamp(x.lastOrderSyncAt, m.period.timezone), orderSyncLabel(x.orderSyncState)]))) : ""}
 ${charts.length ? `<div class="charts">${charts.join("")}</div>` : ""}
 ${s.sections.actions ? section("Priority actions", m.alerts.length ? `<ol class="alert-list">${m.alerts.slice(0,5).map(x => `<li><strong>${h(x.severity)}: ${h(x.message)}</strong> ${h(x.action)}</li>`).join("")}</ol>${m.alerts.length > 5 ? `<p class="muted">${m.alerts.length - 5} additional configured alerts. Review ERP inventory and synchronization filters.</p>` : ""}` : "No configured thresholds exceeded.") : ""}
 ${s.sections.coverage ? section("Definitions and data limits", `<div class="notes">${notes.map(x => `<p>${h(x)}</p>`).join("")}${m.coverage.filter(x => /conflict|no shop assignment|could not be read|no source order date|lack a valid/.test(x)).map(x => `<p>${h(x)}</p>`).join("")}</div>`) : ""}
 </body></html>`;
}
export async function reportAssets(s: ReportSettings) {
 const approved = path.join(process.cwd(), "public/brand/khyatigems-logo.png");
 let bytes = await readFile(approved), mime = "image/png";
 if (s.logo === "COMPANY") {
  const c = await prisma.companySettings.findFirst(); const url = c?.otherDocsLogoUrl || c?.logoUrl;
  if (url?.startsWith("/") && !url.startsWith("//")) {
   const candidate = path.resolve(process.cwd(), "public", `.${url}`), root = path.resolve(process.cwd(), "public") + path.sep;
   if (!candidate.startsWith(root)) throw new Error("Invalid company logo path");
   bytes = await readFile(candidate); mime = candidate.endsWith(".svg") ? "image/svg+xml" : candidate.endsWith(".webp") ? "image/webp" : candidate.endsWith(".jpg") || candidate.endsWith(".jpeg") ? "image/jpeg" : "image/png";
  } // Remote company assets use the approved local company logo. Never fetch arbitrary URLs on the PDF server.
 }
 if (bytes.length > 3000000) throw new Error("Company logo exceeds 3 MB");
 if (mime === "image/svg+xml") bytes = Buffer.from(sanitizeLogoSvg(bytes.toString()));
 return { logo: `data:${mime};base64,${bytes.toString("base64")}`, font: (await readFile(path.join(process.cwd(), "public/fonts/brand-font-0.ttf"))).toString("base64") };
}
export function verifyPdf(pdf: Buffer) { if (pdf.length < 1000 || pdf.subarray(0, 5).toString() !== "%PDF-" || !pdf.subarray(-100).toString().includes("%%EOF")) throw new Error("PDF validation failed"); }
export async function renderReport(m: Metrics, s: ReportSettings, mode: string) {
 const assets = await reportAssets(s);
 // Vercel's function image does not contain Puppeteer's install-time browser cache.
 // Use the Chromium binary shipped as a production dependency there; local development
 // still uses the developer's Puppeteer Chrome unless an explicit path is configured.
 const useServerlessChromium = process.env.VERCEL === "1" && !process.env.REPORT_CHROME_EXECUTABLE_PATH;
 const browser = useServerlessChromium
  ? await puppeteer.launch({ args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }), executablePath: await chromium.executablePath(), headless: "shell" })
  : await (await import("puppeteer")).default.launch({ headless: true, executablePath: process.env.REPORT_CHROME_EXECUTABLE_PATH || undefined, args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"] });
 try {
  const page = await browser.newPage(); await page.setJavaScriptEnabled(false); await page.setRequestInterception(true);
  page.on("request", request => { if (request.url().startsWith("data:") || request.url() === "about:blank") void request.continue(); else void request.abort(); });
  await page.setContent(reportHtml(m, s, assets.logo, assets.font, mode), { waitUntil: "load", timeout: 45000 });
  await page.evaluate(() => document.fonts.ready);
  const bytes = Buffer.from(await page.pdf({ format: "A4", printBackground: true, margin: { top: "15mm", bottom: "20mm", left: "15mm", right: "15mm" }, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: `<div style="font:8px Arial;width:100%;padding:0 15mm;color:#64748b"><span>${h(s.confidentiality)} · ${h(s.footer)}<br>${h(m.period.startDay)} – ${h(m.period.endDay)}</span><span style="float:right">Page <span class="pageNumber"></span> / <span class="totalPages"></span></span></div>` }));
  verifyPdf(bytes); return bytes;
 } finally { await browser.close(); }
}
