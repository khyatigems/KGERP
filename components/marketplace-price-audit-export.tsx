"use client";

import { useState, useCallback } from "react";
import ExcelJS from "exceljs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, DollarSign } from "lucide-react";

interface AuditRow {
  sku: string; itemName: string; category: string; gemType: string;
  carats: number; shape: string; color: string; clarity: string;
  origin: string; originCountry: string; treatment: string; certificateNo: string;
  sellingPrice: number; costPrice: number; erpProfit: number; erpMarginPct: number;
  platform: string; listedPrice: number; currency: string; listedPriceInr: number;
  vsSellingDiff: number; vsSellingMarginPct: number;
  marketplaceProfit: number; marketplaceMarginPct: number;
  listingStatus: string; listingUrl: string; listedDate: string;
}

interface EnhancedRow extends AuditRow {
  _priceStatus: "Below Selling" | "Safe" | "Premium";
  _marginStatus: "Red" | "Amber" | "Green";
  _riskStatus: "Critical" | "Warning" | "Good";
  _actionRequired: string;
  _revenueLeakage: number;
  _opportunityScore: number;
  _premiumPct: number;
  _markupMultiple: number;
  _efficiencyScore: number;
}

// ── Brand Colors ──
const C = {
  navy: "FF1E293B", white: "FFFFFFFF", lightGray: "FFF8FAFC", borderGray: "FFCBD5E1",
  emerald: "FF10B981", emeraldLight: "FFD1FAE5", red: "FFEF4444", redLight: "FFFEE2E2",
  amber: "FFF59E0B", amberLight: "FFFEF3C7", blue: "FF3B82F6", blueLight: "FFDBEAFE",
  teal: "FF0D9488",
};

// ── Utils ──
function sheetDefaults(ws: ExcelJS.Worksheet, xSplit = 3) {
  ws.properties.defaultRowHeight = 22;
  ws.views = [{ state: "frozen", ySplit: 1, xSplit }];
}
function hdr(fill = C.navy): Partial<ExcelJS.Style> {
  return { fill: { type: "pattern", pattern: "solid", fgColor: { argb: fill } }, font: { bold: true, color: { argb: C.white }, size: 11, name: "Calibri" }, alignment: { horizontal: "center", vertical: "middle", wrapText: true }, border: { bottom: { style: "medium", color: { argb: "FF475569" } } } };
}
function applyHeader(ws: ExcelJS.Worksheet, cols: number, fillBg = C.navy) {
  for (let c = 1; c <= cols; c++) ws.getCell(1, c).style = hdr(fillBg) as ExcelJS.Style;
}
function autoWidth(ws: ExcelJS.Worksheet, minW = 10, maxW = 45) {
  ws.columns.forEach((col, i) => {
    if (!col) return; let max = minW;
    ws.eachRow({ includeEmpty: false }, (r) => { const v = r.getCell(i + 1).value?.toString() || ""; max = Math.max(max, Math.min(v.length + 3, maxW)); });
    if (!col.width || col.width < max) col.width = max;
  });
}
function addTbl(ws: ExcelJS.Worksheet, name: string, rowCount: number, colCount: number) {
  try { ws.addTable({ name, ref: `A1:${String.fromCharCode(64 + colCount)}${rowCount}`, headerRow: true, columns: [], rows: [], style: { theme: "TableStyleMedium2", showRowStripes: true } }); } catch {}
}

// ── Enrich ──
function enrich(rows: AuditRow[]): EnhancedRow[] {
  return rows.map((r) => {
    const ps: EnhancedRow["_priceStatus"] = r.listedPriceInr < r.sellingPrice ? "Below Selling" : r.listedPriceInr > r.sellingPrice * 1.15 ? "Premium" : "Safe";
    const ms: EnhancedRow["_marginStatus"] = r.marketplaceMarginPct < 100 ? "Red" : r.marketplaceMarginPct < 300 ? "Amber" : "Green";
    const rs: EnhancedRow["_riskStatus"] = (r.listedPriceInr < r.sellingPrice || r.marketplaceMarginPct < 100) ? "Critical" : (r.marketplaceMarginPct < 300 ? "Warning" : "Good");
    const leakage = r.listedPriceInr < r.sellingPrice ? r.sellingPrice - r.listedPriceInr : 0;
    const premium = r.sellingPrice > 0 ? ((r.listedPriceInr - r.sellingPrice) / r.sellingPrice) * 100 : 0;
    const markup = r.costPrice > 0 ? r.listedPriceInr / r.costPrice : 0;
    const eff = r.costPrice > 0 ? (r.listedPriceInr - r.costPrice) / r.costPrice : 0;
    return { ...r, _priceStatus: ps, _marginStatus: ms, _riskStatus: rs,       _actionRequired: r.listedPriceInr < r.sellingPrice ? "Increase Price" : r.marketplaceMarginPct < 100 ? "Review Margin" : r.listedPriceInr > r.sellingPrice * 1.5 ? "Monitor" : "No Action", _revenueLeakage: leakage, _opportunityScore: r.listedPriceInr > r.sellingPrice * 1.15 ? Math.round(((r.listedPriceInr - r.sellingPrice) / r.sellingPrice) * 100) : 0, _premiumPct: premium, _markupMultiple: markup, _efficiencyScore: eff };
  });
}

// ── QC ──
function validate(rows: EnhancedRow[]): string | null {
  const total = rows.length;
  const leakage = rows.filter((r) => r._revenueLeakage > 0);
  const red = rows.filter((r) => r._marginStatus === "Red");
  const amber = rows.filter((r) => r._marginStatus === "Amber");
  const green = rows.filter((r) => r._marginStatus === "Green");
  if (red.length + amber.length + green.length !== total) return `Margin distribution mismatch: ${red.length}+${amber.length}+${green.length} ≠ ${total}`;
  const hasBadMargin = rows.some((r) => r.marketplaceMarginPct > 10000);
  if (hasBadMargin) return "Margin values appear to be multiplied twice (> 10,000%). API may need fix.";
  return null;
}

// ── Number formats ──
const INR = "₹ #,##0";
const PCT = "0.0\"%\"";
const MULT = "0.00\"x\"";

// ── Conditional formatting ──
function applyCondFmt(ws: ExcelJS.Worksheet, rows: EnhancedRow[], colMap: Record<string, number>) {
  const marginCol = colMap["Margin %"] || colMap["Margin"] || 0;
  const diffCol = colMap["Listed vs Selling"] || colMap["Leakage"] || 0;
  const riskCol = colMap["Risk Status"] || 0;
  const priceCol = colMap["Price Status"] || 0;

  if (marginCol) for (let r = 0; r < rows.length; r++) {
    const m = rows[r].marketplaceMarginPct;
    ws.getCell(r + 2, marginCol).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: m < 100 ? C.redLight : m < 300 ? C.amberLight : C.emeraldLight } }, font: { bold: m < 100, size: 10, name: "Calibri", color: { argb: m < 100 ? C.red : m < 300 ? C.amber : C.emerald } } };
  }
  if (diffCol) for (let r = 0; r < rows.length; r++) {
    const d = rows[r].vsSellingDiff;
    ws.getCell(r + 2, diffCol).font = { bold: true, size: 10, name: "Calibri", color: { argb: d < 0 ? C.red : d > 0 ? C.emerald : C.navy } };
  }
  if (riskCol) for (let r = 0; r < rows.length; r++) {
    const v = rows[r]._riskStatus;
    ws.getCell(r + 2, riskCol).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: v === "Critical" ? C.redLight : v === "Warning" ? C.amberLight : C.emeraldLight } }, font: { bold: v === "Critical", size: 10, name: "Calibri", color: { argb: v === "Critical" ? C.red : v === "Warning" ? C.amber : C.emerald } } };
  }
  if (priceCol) for (let r = 0; r < rows.length; r++) {
    const v = rows[r]._priceStatus;
    ws.getCell(r + 2, priceCol).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: v === "Below Selling" ? C.redLight : v === "Premium" ? C.emeraldLight : C.blueLight } }, font: { bold: v === "Below Selling", size: 10, name: "Calibri", color: { argb: v === "Below Selling" ? C.red : v === "Premium" ? C.emerald : C.blue } } };
  }
}

export function MarketplacePriceAuditExport() {
  const [open, setOpen] = useState(false);
  const [usdRate, setUsdRate] = useState("86");
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    const rate = parseFloat(usdRate);
    if (Number.isNaN(rate) || rate <= 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/price-audit?usdRate=${rate}`);
      const data = await res.json();
      const raw = (data.rows as AuditRow[]) || [];
      if (!raw.length) return;

      const rows = enrich(raw);

      // QC
      const qcErr = validate(rows);
      if (qcErr) { console.error("[Price Audit] QC Failed:", qcErr); alert("Export validation failed:\n" + qcErr); return; }

      const wb = new ExcelJS.Workbook();
      wb.creator = "KhyatiGems ERP"; wb.created = new Date();

      const total = rows.length;
      const totalCost = rows.reduce((s, r) => s + r.costPrice, 0);
      const totalListed = rows.reduce((s, r) => s + r.listedPriceInr, 0);
      const totalProfit = totalListed - totalCost;
      const avgMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
      const totalLeakage = rows.reduce((s, r) => s + r._revenueLeakage, 0);
      const leakageItems = rows.filter((r) => r._revenueLeakage > 0);
      const priceAlerts = rows.filter((r) => r._priceStatus === "Below Selling").length;
      const lowMargin = rows.filter((r) => r._marginStatus === "Red").length;
      const opps = rows.filter((r) => r._priceStatus === "Premium").length;

      // Pivots
      const pivot = (fn: (r: EnhancedRow) => string) => {
        const m = new Map<string, { count: number; cost: number; listed: number }>();
        for (const r of rows) { const k = fn(r); const e = m.get(k) || { count: 0, cost: 0, listed: 0 }; e.count++; e.cost += r.costPrice; e.listed += r.listedPriceInr; m.set(k, e); }
        return Array.from(m.entries()).map(([k, e]) => ({ key: k, ...e, profit: e.listed - e.cost, margin: e.cost > 0 ? ((e.listed - e.cost) / e.cost) * 100 : 0 })).sort((a, b) => b.profit - a.profit);
      };

      const mpData = pivot((r) => r.platform || "Unknown");
      const catData = pivot((r) => r.category || "Unknown");
      const bestMp = mpData[0];
      const bestCat = catData[0];
      const bestSku = [...rows].sort((a, b) => (b.listedPriceInr - b.costPrice) - (a.listedPriceInr - a.costPrice))[0];

      // ═══════ SHEET 1: Executive Summary ═══════
      const ws1 = wb.addWorksheet("Executive Summary", { properties: { tabColor: { argb: C.emerald } } });
      ws1.views = [{ state: "normal" }];

      ws1.mergeCells("A1:D1"); ws1.getCell("A1").value = "MARKETPLACE INTELLIGENCE REPORT"; ws1.getCell("A1").style = { font: { bold: true, size: 18, color: { argb: C.navy }, name: "Calibri" }, alignment: { horizontal: "center" } }; ws1.getRow(1).height = 36;
      ws1.mergeCells("A2:D2"); ws1.getCell("A2").value = `Generated: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  |  USD Rate: ₹${rate}  |  Active Listings: ${total}`; ws1.getCell("A2").font = { size: 11, color: { argb: "FF64748B" }, name: "Calibri" }; ws1.getCell("A2").alignment = { horizontal: "center" };

      const scorecard = [
        ["MANAGEMENT SCORECARD", "", "", ""],
        ["Active Listings", total, "Revenue Leakage", `₹${Math.round(totalLeakage).toLocaleString("en-IN")}`],
        ["Sold Listings", 0, "Revenue Leakage %", `${totalListed > 0 ? Math.round(totalLeakage / totalListed * 1000) / 10 : 0}%`],
        ["Inactive Listings", 0, "Avg Margin", `${avgMargin.toFixed(1)}%`],
        ["Total Records", total, "Avg Markup", `${(rows.reduce((s, r) => s + r._markupMultiple, 0) / total).toFixed(2)}x`],
        ["Price Alerts", priceAlerts, "Low Margin Alerts", lowMargin],
        ["Opportunities", opps, "Risk (Critical)", rows.filter((r) => r._riskStatus === "Critical").length],
        ["Best Marketplace", bestMp?.key || "—", "Best Category", bestCat?.key || "—"],
        ["Best SKU", bestSku ? `${bestSku.sku} (${bestSku.itemName.slice(0, 30)})` : "—", "Highest Profit", bestSku ? `₹${Math.round(bestSku.listedPriceInr - bestSku.costPrice).toLocaleString("en-IN")}` : "—"],
      ];

      scorecard.forEach((row, i) => {
        const rn = i + 4;
        ws1.getCell(`A${rn}`).value = row[0]; ws1.getCell(`A${rn}`).style = { font: { bold: i === 0, size: i === 0 ? 13 : 11, name: "Calibri", color: { argb: i === 0 ? C.navy : "FF334155" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: i === 0 ? C.lightGray : C.white } } };
        ws1.getCell(`B${rn}`).value = row[1] !== undefined ? row[1] : ""; ws1.getCell(`B${rn}`).style = { font: { bold: true, size: 13, name: "Calibri", color: { argb: C.navy } }, alignment: { horizontal: "right" } };
        ws1.getCell(`C${rn}`).value = row[2] !== undefined ? row[2] : ""; ws1.getCell(`C${rn}`).style = { font: { bold: i === 0, size: i === 0 ? 13 : 11, name: "Calibri", color: { argb: i === 0 ? C.navy : "FF334155" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: i === 0 ? C.lightGray : C.white } } };
        ws1.getCell(`D${rn}`).value = row[3] !== undefined ? row[3] : ""; ws1.getCell(`D${rn}`).style = { font: { bold: true, size: 13, name: "Calibri", color: { argb: C.navy } }, alignment: { horizontal: "right" } };
        ws1.getRow(rn).height = i === 0 ? 32 : 26;
      });
      ws1.getColumn(1).width = 28; ws1.getColumn(2).width = 26; ws1.getColumn(3).width = 28; ws1.getColumn(4).width = 26;

      // ═══════ SHEET 2: Price Audit Analysis ═══════
      const ws2 = wb.addWorksheet("Price Audit Analysis", { properties: { tabColor: { argb: C.blue } } });
      sheetDefaults(ws2);
      const h2 = ["SKU", "Item Name", "Category", "Marketplace", "ERP Selling (INR)", "Cost Price (INR)", "Listed Price (INR)", "Listed vs Selling (INR)", "Margin %", "ERP Margin %", "Premium %", "Markup (x)", "Efficiency", "Price Status", "Risk Status", "Revenue Leakage (INR)", "Action Required", "Listing URL"];
      ws2.addRow(h2); applyHeader(ws2, h2.length);

      for (const r of rows) ws2.addRow([r.sku, r.itemName, r.category, r.platform, r.sellingPrice, r.costPrice, r.listedPriceInr, r.vsSellingDiff, r.marketplaceMarginPct, r.erpMarginPct, r._premiumPct, r._markupMultiple, r._efficiencyScore, r._priceStatus, r._riskStatus, r._revenueLeakage, r._actionRequired, r.listingUrl]);

      addTbl(ws2, "tblAudit", total + 1, h2.length);
      applyCondFmt(ws2, rows, { "Margin %": 9, "Listed vs Selling": 8, "Risk Status": 15, "Price Status": 14 });

      for (let r = 0; r < total; r++) {
        const rn = r + 2;
        [5, 6, 7, 8, 16].forEach((c) => ws2.getCell(rn, c).numFmt = INR);
        [9, 10, 11].forEach((c) => ws2.getCell(rn, c).numFmt = PCT);
        ws2.getCell(rn, 12).numFmt = MULT;
        ws2.getCell(rn, 13).numFmt = "0.00";
      }
      autoWidth(ws2);

      // ═══════ SHEET 3: Marketplace Profitability ═══════
      const ws3 = wb.addWorksheet("Marketplace Profitability", { properties: { tabColor: { argb: C.teal } } });
      sheetDefaults(ws3);
      const h3 = ["Marketplace", "Listings", "Cost Value (INR)", "Listed Value (INR)", "Profit (INR)", "Margin %", "Profit Share %"];
      ws3.addRow(h3); applyHeader(ws3, h3.length);

      for (const m of mpData) ws3.addRow([m.key, m.count, Math.round(m.cost), Math.round(m.listed), Math.round(m.profit), m.margin, totalProfit > 0 ? Math.round(m.profit / totalProfit * 1000) / 10 : 0]);
      addTbl(ws3, "tblMp", mpData.length + 1, h3.length); autoWidth(ws3);
      for (let r = 2; r <= mpData.length + 1; r++) { ws3.getCell(r, 3).numFmt = INR; ws3.getCell(r, 4).numFmt = INR; ws3.getCell(r, 5).numFmt = INR; ws3.getCell(r, 6).numFmt = PCT; ws3.getCell(r, 7).numFmt = PCT; }

      // ═══════ SHEET 4: Category Profitability ═══════
      const ws4 = wb.addWorksheet("Category Profitability", { properties: { tabColor: { argb: C.teal } } });
      sheetDefaults(ws4);
      const h4 = ["Category", "Listings", "Cost Value (INR)", "Listed Value (INR)", "Profit (INR)", "Margin %", "Profit Share %"];
      ws4.addRow(h4); applyHeader(ws4, h4.length);

      for (const c of catData) ws4.addRow([c.key, c.count, Math.round(c.cost), Math.round(c.listed), Math.round(c.profit), c.margin, totalProfit > 0 ? Math.round(c.profit / totalProfit * 1000) / 10 : 0]);
      addTbl(ws4, "tblCat", catData.length + 1, h4.length); autoWidth(ws4);
      for (let r = 2; r <= catData.length + 1; r++) { ws4.getCell(r, 3).numFmt = INR; ws4.getCell(r, 4).numFmt = INR; ws4.getCell(r, 5).numFmt = INR; ws4.getCell(r, 6).numFmt = PCT; ws4.getCell(r, 7).numFmt = PCT; }

      // ═══════ SHEET 5: Revenue Leakage ═══════
      const ws5 = wb.addWorksheet("Revenue Leakage", { properties: { tabColor: { argb: C.red } } });
      sheetDefaults(ws5);

      // Summary section
      const biggestLeak = leakageItems.sort((a, b) => b._revenueLeakage - a._revenueLeakage)[0];
      const summary = [
        ["", "REVENUE LEAKAGE SUMMARY", "", "", ""],
        ["", "Total Affected Listings", leakageItems.length, "", ""],
        ["", "Total Revenue Leakage", `₹${Math.round(totalLeakage).toLocaleString("en-IN")}`, "", ""],
        ["", "Largest Leakage SKU", biggestLeak?.sku || "—", "", ""],
        ["", "Largest Leakage Amount", biggestLeak ? `₹${Math.round(biggestLeak._revenueLeakage).toLocaleString("en-IN")}` : "—", "", ""],
        ["", "Average Leakage", leakageItems.length > 0 ? `₹${Math.round(totalLeakage / leakageItems.length).toLocaleString("en-IN")}` : "—", "", ""],
        ["", "Leakage % of Revenue", `${totalListed > 0 ? Math.round(totalLeakage / totalListed * 1000) / 10 : 0}%`, "", ""],
        ["", "", "", "", ""],
      ];
      summary.forEach((r, i) => { const rn = i + 1; for (let c = 0; c < 5; c++) { ws5.getCell(rn, c + 1).value = r[c]; } });
      ws5.getCell("B1").style = { font: { bold: true, size: 14, color: { argb: C.red }, name: "Calibri" } };
      ws5.getRow(1).height = 30;

      const leakStart = summary.length + 1;
      const h5 = ["SKU", "Product Name", "Marketplace", "ERP Selling (INR)", "Listed Price (INR)", "Revenue Leakage (INR)"];
      ws5.addRow(h5); applyHeader(ws5, h5.length, C.red);

      let lr = leakStart + 1;
      for (const r of leakageItems.sort((a, b) => b._revenueLeakage - a._revenueLeakage)) {
        ws5.addRow([r.sku, r.itemName, r.platform, r.sellingPrice, r.listedPriceInr, Math.round(r._revenueLeakage)]);
        const intensity = Math.min(Math.round(255 * (r._revenueLeakage / (biggestLeak?._revenueLeakage || 1))), 200);
        ws5.getCell(lr, 6).style = { fill: { type: "pattern", pattern: "solid", fgColor: { argb: `FF${intensity.toString(16).padStart(2, "0")}0000` } }, font: { color: { argb: intensity > 100 ? C.white : C.navy }, bold: true, size: 10, name: "Calibri" } };
        ws5.getCell(lr, 4).numFmt = INR; ws5.getCell(lr, 5).numFmt = INR; ws5.getCell(lr, 6).numFmt = INR;
        lr++;
      }
      autoWidth(ws5);

      // ═══════ SHEET 6: Top 20 Best SKUs ═══════
      const ws6 = wb.addWorksheet("Best Performing SKUs", { properties: { tabColor: { argb: C.emerald } } });
      sheetDefaults(ws6);
      const h6 = ["Rank", "SKU", "Product Name", "Marketplace", "Category", "Listed Price (INR)", "Cost Price (INR)", "Profit (INR)", "Margin %", "Markup (x)", "Efficiency"];
      ws6.addRow(h6); applyHeader(ws6, h6.length, C.emerald);

      const top20 = [...rows].sort((a, b) => (b.listedPriceInr - b.costPrice) - (a.listedPriceInr - a.costPrice)).slice(0, 20);
      top20.forEach((r, i) => ws6.addRow([i + 1, r.sku, r.itemName, r.platform, r.category, Math.round(r.listedPriceInr), Math.round(r.costPrice), Math.round(r.listedPriceInr - r.costPrice), r.marketplaceMarginPct, r._markupMultiple, r._efficiencyScore]));
      addTbl(ws6, "tblBest", top20.length + 1, h6.length); autoWidth(ws6);
      for (let r = 2; r <= top20.length + 1; r++) { ws6.getCell(r, 6).numFmt = INR; ws6.getCell(r, 7).numFmt = INR; ws6.getCell(r, 8).numFmt = INR; ws6.getCell(r, 9).numFmt = PCT; ws6.getCell(r, 10).numFmt = MULT; ws6.getCell(r, 11).numFmt = "0.00"; ws6.getCell(r, 8).font = { color: { argb: C.emerald }, bold: true, size: 10, name: "Calibri" }; }

      // ═══════ SHEET 7: Bottom 10 Margin ═══════
      const ws7 = wb.addWorksheet("Bottom 10 Margin", { properties: { tabColor: { argb: C.red } } });
      sheetDefaults(ws7);

      const h7 = ["SKU", "Product Name", "Category", "Marketplace", "Listed Price (INR)", "Cost Price (INR)", "Profit (INR)", "Margin %", "Price Status", "Risk Status", "Action Required"];
      ws7.addRow(h7); applyHeader(ws7, h7.length, C.red);

      const bot10 = [...rows].sort((a, b) => a.marketplaceMarginPct - b.marketplaceMarginPct).slice(0, 10);
      bot10.forEach((r) => ws7.addRow([r.sku, r.itemName, r.category, r.platform, Math.round(r.listedPriceInr), Math.round(r.costPrice), Math.round(r.listedPriceInr - r.costPrice), r.marketplaceMarginPct, r._priceStatus, r._riskStatus, r._actionRequired]));
      addTbl(ws7, "tblBot", bot10.length + 1, h7.length); autoWidth(ws7);
      for (let r = 2; r <= bot10.length + 1; r++) { ws7.getCell(r, 5).numFmt = INR; ws7.getCell(r, 6).numFmt = INR; ws7.getCell(r, 7).numFmt = INR; ws7.getCell(r, 8).numFmt = PCT; ws7.getCell(r, 8).font = { color: { argb: C.red }, bold: true, size: 10, name: "Calibri" }; }

      // ═══════ SHEET 8: Margin Distribution ═══════
      const ws8 = wb.addWorksheet("Margin Distribution", { properties: { tabColor: { argb: C.amber } } });
      sheetDefaults(ws8);

      const red = rows.filter((r) => r._marginStatus === "Red").length;
      const amber = rows.filter((r) => r._marginStatus === "Amber").length;
      const green = rows.filter((r) => r._marginStatus === "Green").length;

      ws8.addRow(["Margin Level", "Count", "Percentage"]); applyHeader(ws8, 3, C.amber);
      ws8.addRow(["Red (< 100%)", red, total > 0 ? Math.round(red / total * 1000) / 10 : 0]);
      ws8.addRow(["Amber (100–300%)", amber, total > 0 ? Math.round(amber / total * 1000) / 10 : 0]);
      ws8.addRow(["Green (> 300%)", green, total > 0 ? Math.round(green / total * 1000) / 10 : 0]);
      ws8.addRow(["TOTAL", total, 100]);

      addTbl(ws8, "tblDist", 5, 3); autoWidth(ws8);
      for (let r = 2; r <= 5; r++) ws8.getCell(r, 3).numFmt = PCT;
      ws8.getCell(2, 1).font = { color: { argb: C.red }, bold: true, size: 10, name: "Calibri" };
      ws8.getCell(3, 1).font = { color: { argb: C.amber }, bold: true, size: 10, name: "Calibri" };
      ws8.getCell(4, 1).font = { color: { argb: C.emerald }, bold: true, size: 10, name: "Calibri" };
      ws8.getCell(5, 1).font = { bold: true, size: 10, name: "Calibri" };

      // ═══════ SHEET 9: Dead Listings ═══════
      const ws9 = wb.addWorksheet("Dead Listings", { properties: { tabColor: { argb: "FF6B7280" } } });
      sheetDefaults(ws9);
      const day60ago = new Date(); day60ago.setDate(day60ago.getDate() - 60);
      const deadListings = rows.filter((r) => r.listedDate && new Date(r.listedDate) < day60ago);

      const h9 = ["SKU", "Product Name", "Marketplace", "Days Active", "Current Margin %", "Revenue Potential (INR)"];
      ws9.addRow(h9); applyHeader(ws9, h9.length, "FF6B7280");

      deadListings.forEach((r) => {
        const days = Math.round((Date.now() - new Date(r.listedDate).getTime()) / 86400000);
        ws9.addRow([r.sku, r.itemName, r.platform, days, r.marketplaceMarginPct, Math.round(r.listedPriceInr - r.costPrice)]);
      });
      addTbl(ws9, "tblDead", deadListings.length + 1, h9.length); autoWidth(ws9);
      for (let r = 2; r <= deadListings.length + 1; r++) { ws9.getCell(r, 5).numFmt = PCT; ws9.getCell(r, 6).numFmt = INR; }

      // ═══════ SHEET 10: Sales Performance (placeholder) ═══════
      const ws10 = wb.addWorksheet("Sales Performance", { properties: { tabColor: { argb: C.blue } } });
      sheetDefaults(ws10);
      ws10.addRow(["SALES PERFORMANCE — SOLD LISTINGS"]); ws10.mergeCells("A1:H1");
      ws10.getCell("A1").font = { bold: true, size: 14, color: { argb: C.navy }, name: "Calibri" };
      ws10.getRow(1).height = 30;
      ws10.addRow(["This sheet will populate when listings are marked as Sold.", "", "", "", "", "", "", ""]);
      ws10.addRow(["Expected columns: SKU, Marketplace, Cost Price, Sold Amount, Currency, Sold Value INR, Profit, Margin %, Marketplace Fee, Net Sale, Sold Date", "", "", "", "", "", "", ""]);
      autoWidth(ws10);

      // ── Write ──
      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `marketplace-price-audit-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (err) { console.error("Export failed:", err); }
    finally { setLoading(false); setOpen(false); }
  }, [usdRate]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" /> Export Price Audit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Price Audit Export</DialogTitle>
            <DialogDescription>Professional marketplace intelligence report with 10 sheets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="usdRate">USD to INR Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-8">1 USD</span><span className="text-lg">=</span>
                <Input id="usdRate" type="number" step="0.01" min="1" value={usdRate} onChange={(e) => setUsdRate(e.target.value)} className="w-32 text-center text-lg font-bold" />
                <span className="text-sm font-medium text-muted-foreground w-8">INR</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button onClick={handleExport} disabled={loading || !usdRate || parseFloat(usdRate) <= 0}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Download className="mr-2 h-4 w-4" /> Download Excel</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
