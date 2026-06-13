"use client";

import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Loader2, DollarSign } from "lucide-react";

interface AuditRow {
  sku: string;
  itemName: string;
  category: string;
  gemType: string;
  carats: number;
  shape: string;
  color: string;
  clarity: string;
  origin: string;
  originCountry: string;
  treatment: string;
  certificateNo: string;
  sellingPrice: number;
  platform: string;
  listedPrice: number;
  currency: string;
  listedPriceInr: number;
  priceDiff: number;
  marginPct: number;
  listingStatus: string;
  listingUrl: string;
}

export function MarketplacePriceAuditExport() {
  const [open, setOpen] = useState(false);
  const [usdRate, setUsdRate] = useState("87");
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    const rate = parseFloat(usdRate);
    if (Number.isNaN(rate) || rate <= 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/price-audit?usdRate=${rate}`);
      const data = await res.json();
      if (!data.rows?.length) return;

      const rows = data.rows as AuditRow[];
      const exportRows = rows.map((r) => ({
        SKU: r.sku,
        "Item Name": r.itemName,
        Category: r.category,
        "Gem Type": r.gemType,
        "Weight (ct)": r.carats || "",
        Shape: r.shape,
        Color: r.color,
        Clarity: r.clarity,
        Origin: r.originCountry || r.origin,
        Certification: r.certificateNo || "-",
        Treatment: r.treatment,
        "ERP Selling Price (INR)": r.sellingPrice,
        Marketplace: r.platform,
        "Listed Price (Orig)": r.listedPrice,
        Currency: r.currency,
        "Listed Price (INR)": r.listedPriceInr,
        "Price Diff (INR)": r.priceDiff,
        "Margin %": r.marginPct,
        Status: r.listingStatus,
        "Listing Link": r.listingUrl,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);

      const colWidths = [
        { wch: 22 },  // SKU
        { wch: 30 },  // Item Name
        { wch: 16 },  // Category
        { wch: 14 },  // Gem Type
        { wch: 12 },  // Weight
        { wch: 12 },  // Shape
        { wch: 12 },  // Color
        { wch: 14 },  // Clarity
        { wch: 16 },  // Origin
        { wch: 14 },  // Certification
        { wch: 12 },  // Treatment
        { wch: 22 },  // ERP Selling Price
        { wch: 14 },  // Marketplace
        { wch: 18 },  // Listed Price (Orig)
        { wch: 10 },  // Currency
        { wch: 18 },  // Listed Price (INR)
        { wch: 16 },  // Price Diff
        { wch: 12 },  // Margin %
        { wch: 12 },  // Status
        { wch: 50 },  // Listing Link
      ];
      ws["!cols"] = colWidths;

      const marginCol = "R";
      const diffCol = "Q";

      for (let i = 1; i <= exportRows.length; i++) {
        const rowNum = i + 1;
        const marginVal = exportRows[i - 1]["Margin %"] as number;

        const marginRef = `${marginCol}${rowNum}`;
        if (ws[marginRef]) {
          ws[marginRef].t = "n";
          ws[marginRef].z = "0.0%";
          ws[marginRef].v = marginVal / 100;
        }

        const marginCell = ws[marginRef];
        if (marginCell) {
          if (marginVal >= 20) {
            marginCell.s = { fill: { fgColor: { rgb: "FFD5F5E3" } }, font: { color: { rgb: "FF1B5E20" }, bold: true } };
          } else if (marginVal >= 10) {
            marginCell.s = { fill: { fgColor: { rgb: "FFFEF9C3" } }, font: { color: { rgb: "FF856404" }, bold: true } };
          } else {
            marginCell.s = { fill: { fgColor: { rgb: "FFFFE0E0" } }, font: { color: { rgb: "FFB71C1C" }, bold: true } };
          }
        }

        const diffRef = `${diffCol}${rowNum}`;
        const diffCell = ws[diffRef];
        if (diffCell) {
          if (exportRows[i - 1]["Price Diff (INR)"] < 0) {
            diffCell.s = { fill: { fgColor: { rgb: "FFFFE0E0" } }, font: { color: { rgb: "FFB71C1C" }, bold: true } };
          } else if (exportRows[i - 1]["Price Diff (INR)"] > 0) {
            diffCell.s = { fill: { fgColor: { rgb: "FFD5F5E3" } }, font: { color: { rgb: "FF1B5E20" } } };
          }
        }
      }

      const headerStyle = {
        fill: { fgColor: { rgb: "FF1E293B" } },
        font: { bold: true, color: { rgb: "FFFFFFFF" }, sz: 11 },
        alignment: { horizontal: "center" as const, wrapText: true },
      };

      const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1:T1");
      for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[ref]) ws[ref].s = headerStyle;
      }

      XLSX.utils.book_append_sheet(wb, ws, "Price Audit");
      XLSX.writeFile(wb, `marketplace-price-audit-${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Price audit export failed:", err);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }, [usdRate]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Download className="mr-2 h-4 w-4" />
        Export Price Audit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Price Audit Export
            </DialogTitle>
            <DialogDescription>
              Enter today&apos;s USD to INR conversion rate to compare marketplace prices with ERP selling prices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="usdRate">USD to INR Rate</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground w-8">1 USD</span>
                <span className="text-lg">=</span>
                <Input
                  id="usdRate"
                  type="number"
                  step="0.01"
                  min="1"
                  value={usdRate}
                  onChange={(e) => setUsdRate(e.target.value)}
                  className="w-32 text-center text-lg font-bold"
                />
                <span className="text-sm font-medium text-muted-foreground w-8">INR</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Prices in USD/EUR will be converted to INR using this rate. INR listings remain unchanged.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading || !usdRate || parseFloat(usdRate) <= 0}>
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><Download className="mr-2 h-4 w-4" /> Download Excel</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
