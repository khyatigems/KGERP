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
  costPrice: number;
  erpProfit: number;
  erpMarginPct: number;
  platform: string;
  listedPrice: number;
  currency: string;
  listedPriceInr: number;
  vsSellingDiff: number;
  vsSellingMarginPct: number;
  marketplaceProfit: number;
  marketplaceMarginPct: number;
  listingStatus: string;
  listingUrl: string;
}

const COL_WIDTHS = [
  { wch: 22 },  // SKU
  { wch: 30 },  // Item Name
  { wch: 16 },  // Category
  { wch: 14 },  // Gem Type
  { wch: 10 },  // Weight
  { wch: 12 },  // Shape
  { wch: 12 },  // Color
  { wch: 14 },  // Clarity
  { wch: 16 },  // Origin
  { wch: 14 },  // Certification
  { wch: 12 },  // Treatment
  { wch: 20 },  // Selling Price
  { wch: 18 },  // Cost Price
  { wch: 16 },  // ERP Profit
  { wch: 14 },  // ERP Margin %
  { wch: 14 },  // Marketplace
  { wch: 16 },  // List Price Orig
  { wch: 10 },  // Currency
  { wch: 18 },  // List Price INR
  { wch: 16 },  // Price vs Selling
  { wch: 14 },  // Margin vs Selling
  { wch: 18 },  // Profit vs Cost
  { wch: 16 },  // Margin vs Cost
  { wch: 12 },  // Status
  { wch: 50 },  // Listing Link
];

const HEADER_STYLE = {
  fill: { fgColor: { rgb: "FF1E293B" } },
  font: { bold: true, color: { rgb: "FFFFFFFF" }, sz: 11, name: "Calibri" },
  alignment: { horizontal: "center" as const, wrapText: true, vertical: "center" as const },
  border: {
    bottom: { style: "medium" as const, color: { rgb: "FF475569" } },
  },
};

function greenStyle(bold = false) {
  return {
    fill: { fgColor: { rgb: "FFD5F5E3" } },
    font: { color: { rgb: "FF1B5E20" }, bold, sz: 10, name: "Calibri" },
    alignment: { horizontal: "center" as const },
  };
}

function yellowStyle(bold = false) {
  return {
    fill: { fgColor: { rgb: "FFFEF9C3" } },
    font: { color: { rgb: "FF856404" }, bold, sz: 10, name: "Calibri" },
    alignment: { horizontal: "center" as const },
  };
}

function redStyle(bold = false) {
  return {
    fill: { fgColor: { rgb: "FFFFE0E0" } },
    font: { color: { rgb: "FFB71C1C" }, bold, sz: 10, name: "Calibri" },
    alignment: { horizontal: "center" as const },
  };
}

function neutralStyle() {
  return {
    font: { sz: 10, name: "Calibri" },
    alignment: { horizontal: "center" as const },
  };
}

function zebraStyle(rowNum: number) {
  if (rowNum % 2 === 0) {
    return { fill: { fgColor: { rgb: "FFF8FAFC" } } };
  }
  return {};
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
        "SKU": r.sku,
        "Item Name": r.itemName,
        "Category": r.category,
        "Gem Type": r.gemType,
        "Weight (ct)": r.carats || "",
        "Shape": r.shape,
        "Color": r.color,
        "Clarity": r.clarity,
        "Origin": r.originCountry || r.origin,
        "Certification": r.certificateNo || "-",
        "Treatment": r.treatment,
        "Selling Price (INR)": r.sellingPrice,
        "Cost Price (INR)": r.costPrice,
        "ERP Profit (INR)": r.erpProfit,
        "ERP Margin %": r.erpMarginPct,
        "Marketplace": r.platform,
        "Listed Price (Orig)": r.listedPrice,
        "Currency": r.currency,
        "Listed Price (INR)": r.listedPriceInr,
        "Price vs Selling (INR)": r.vsSellingDiff,
        "Margin vs Selling %": r.vsSellingMarginPct,
        "Profit vs Cost (INR)": r.marketplaceProfit,
        "Margin vs Cost %": r.marketplaceMarginPct,
        "Status": r.listingStatus,
        "Listing Link": r.listingUrl,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportRows);

      ws["!cols"] = COL_WIDTHS;

      const headerCols = [
        "A","B","C","D","E","F","G","H","I","J","K","L","M","N","O",
        "P","Q","R","S","T","U","V","W","X","Y"
      ];

      for (const col of headerCols) {
        const ref = `${col}1`;
        if (ws[ref]) ws[ref].s = HEADER_STYLE;
      }

      ws["!freeze"] = { x: 0, y: 1 };

      for (let i = 0; i < exportRows.length; i++) {
        const rowNum = i + 2;
        const row = exportRows[i];

        const zebra = zebraStyle(i);

        const erpMarginRef = `O${rowNum}`;
        if (ws[erpMarginRef]) {
          ws[erpMarginRef].t = "n";
          ws[erpMarginRef].z = "0.0%";
          ws[erpMarginRef].v = (row["ERP Margin %"] as number) / 100;
          const val = row["ERP Margin %"] as number;
          if (val >= 30) ws[erpMarginRef].s = { ...greenStyle(), ...zebra };
          else if (val >= 15) ws[erpMarginRef].s = { ...yellowStyle(), ...zebra };
          else ws[erpMarginRef].s = { ...redStyle(), ...zebra };
        }

        const diffRef = `T${rowNum}`;
        if (ws[diffRef]) {
          ws[diffRef].s = { ...(row["Price vs Selling (INR)"] < 0 ? redStyle() : row["Price vs Selling (INR)"] > 0 ? greenStyle() : neutralStyle()), ...zebra };
        }

        const vsSellMarginRef = `U${rowNum}`;
        if (ws[vsSellMarginRef]) {
          ws[vsSellMarginRef].t = "n";
          ws[vsSellMarginRef].z = "0.0%";
          ws[vsSellMarginRef].v = (row["Margin vs Selling %"] as number) / 100;
          const val = row["Margin vs Selling %"] as number;
          if (val >= 20) ws[vsSellMarginRef].s = { ...greenStyle(), ...zebra };
          else if (val >= 10) ws[vsSellMarginRef].s = { ...yellowStyle(), ...zebra };
          else ws[vsSellMarginRef].s = { ...redStyle(), ...zebra };
        }

        const profitRef = `V${rowNum}`;
        if (ws[profitRef]) {
          ws[profitRef].s = { ...(row["Profit vs Cost (INR)"] < 0 ? redStyle(true) : row["Profit vs Cost (INR)"] > 0 ? greenStyle(true) : neutralStyle()), ...zebra };
        }

        const costMarginRef = `W${rowNum}`;
        if (ws[costMarginRef]) {
          ws[costMarginRef].t = "n";
          ws[costMarginRef].z = "0.0%";
          ws[costMarginRef].v = (row["Margin vs Cost %"] as number) / 100;
          const val = row["Margin vs Cost %"] as number;
          if (val >= 50) ws[costMarginRef].s = { ...greenStyle(true), ...zebra };
          else if (val >= 25) ws[costMarginRef].s = { ...yellowStyle(), ...zebra };
          else ws[costMarginRef].s = { ...redStyle(true), ...zebra };
        }

        const erpProfitRef = `N${rowNum}`;
        if (ws[erpProfitRef]) {
          ws[erpProfitRef].s = { ...(row["ERP Profit (INR)"] < 0 ? redStyle(true) : row["ERP Profit (INR)"] > 0 ? greenStyle(true) : neutralStyle()), ...zebra };
        }

        const inrRefs = ["L", "M", "N", "S", "T", "V"];
        for (const col of inrRefs) {
          const ref = `${col}${rowNum}`;
          if (ws[ref]) {
            ws[ref].z = "₹ #,##0.00";
            ws[ref].s = { ...(ws[ref].s || {}), ...zebra };
          }
        }

        const usdRefs = ["R"];
        for (const col of usdRefs) {
          const ref = `${col}${rowNum}`;
          if (ws[ref]) {
            ws[ref].z = "#,##0.00";
          }
        }
      }

      ws["!autofilter"] = { ref: ws["!ref"] || "A1:Y1" };

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
              Enter today&apos;s USD to INR conversion rate to compare marketplace prices with ERP cost &amp; selling prices.
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
