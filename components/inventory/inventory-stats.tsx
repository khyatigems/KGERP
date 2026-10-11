"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Boxes, CircleDollarSign, ImageIcon, FileCheck, Clock } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";

type StatRow = { totalItems: number; overallTotalItems: number; totalSell: number };
type ByCategoryRow = { category: string; status: string; items: number; sellValue: number };
type ByGemTypeRow = { gemType: string; status: string; items: number; sellValue: number };
type ByCategoryGemTypeRow = { category: string; gemType: string; status: string; items: number; sellValue: number };
type ByStatusRow = { status: string; items: number };

type InventoryStatsResponse = StatRow & {
  avgSell: number;
  maxSell: number;
  withImagesCount: number;
  withCertificateCount: number;
  aging: { fresh: number; slow: number; dead: number };
  byCategory: ByCategoryRow[];
  byGemType: ByGemTypeRow[];
  byCategoryGemType: ByCategoryGemTypeRow[];
  byStatus: ByStatusRow[];
  overallByStatus: ByStatusRow[];
};

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
};

export function InventoryStats({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  const qs = useMemo(() => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    return params.toString();
  }, [searchParams]);

  const url = `/api/inventory/stats?mode=full${qs ? `&${qs}` : ""}`;

  const { data, isLoading, isValidating, error } = useSWR<InventoryStatsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const overallStatusSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data?.overallByStatus || []) map.set(r.status, r.items);
    return {
      inStock: map.get("IN_STOCK") || 0,
      reserved: map.get("RESERVED") || 0,
      memo: map.get("MEMO") || 0,
      sold: map.get("SOLD") || 0,
    };
  }, [data?.overallByStatus]);

  const categoryExport = useMemo(() => {
    const table1Rows = (data?.byCategory || []).filter(r => r.status === "IN_STOCK" || r.status === "RESERVED").map((r) => ({
      Category: r.category,
      Status: r.status,
      Items: r.items,
      "Sell Value": r.sellValue,
    }));
    const table2Rows = (data?.byCategory || []).filter(r => r.status === "SOLD" || r.status === "MEMO").map((r) => ({
      Category: r.category,
      Status: r.status,
      Items: r.items,
      "Sell Value": r.sellValue,
    }));
    const summaryRows = [
      { Metric: "In Stock", Items: overallStatusSummary.inStock },
      { Metric: "Reserved", Items: overallStatusSummary.reserved },
      { Metric: "Memo", Items: overallStatusSummary.memo },
      { Metric: "Sold", Items: overallStatusSummary.sold },
    ];
    
    return {
      multiTable: [
        {
          title: "In Stock & Reserved Items",
          rows: table1Rows,
          columns: [
            { header: "Category", key: "Category" },
            { header: "Status", key: "Status" },
            { header: "Items", key: "Items" },
            { header: "Sell Value", key: "Sell Value" },
          ],
        },
        {
          title: "Sold & Memo Items",
          rows: table2Rows,
          columns: [
            { header: "Category", key: "Category" },
            { header: "Status", key: "Status" },
            { header: "Items", key: "Items" },
            { header: "Sell Value", key: "Sell Value" },
          ],
        },
        {
          title: "Overall Summary",
          rows: summaryRows,
          columns: [
            { header: "Metric", key: "Metric" },
            { header: "Items", key: "Items" },
          ],
        }
      ]
    };
  }, [data?.byCategory, overallStatusSummary]);

  const gemTypeExport = useMemo(() => {
    const orderCategory = (c: string) => {
      const v = (c || "").toLowerCase();
      if (v.includes("loose")) return 0;
      if (v.includes("bracelet")) return 1;
      return 2;
    };
    const sortedData = (data?.byCategoryGemType || [])
      .slice()
      .sort((a, b) => {
        const ao = orderCategory(a.category);
        const bo = orderCategory(b.category);
        if (ao !== bo) return ao - bo;
        const c = a.category.localeCompare(b.category);
        if (c !== 0) return c;
        return a.gemType.localeCompare(b.gemType);
      });

    const table1Rows = sortedData.filter(r => r.status === "IN_STOCK" || r.status === "RESERVED").map((r) => ({
      Category: r.category,
      "Gem Type": r.gemType,
      Status: r.status,
      Items: r.items,
      "Sell Value": r.sellValue,
    }));
    
    const table2Rows = sortedData.filter(r => r.status === "SOLD" || r.status === "MEMO").map((r) => ({
      Category: r.category,
      "Gem Type": r.gemType,
      Status: r.status,
      Items: r.items,
      "Sell Value": r.sellValue,
    }));

    const summaryRows = [
      { Metric: "In Stock", Items: overallStatusSummary.inStock },
      { Metric: "Reserved", Items: overallStatusSummary.reserved },
      { Metric: "Memo", Items: overallStatusSummary.memo },
      { Metric: "Sold", Items: overallStatusSummary.sold },
    ];

    return {
      multiTable: [
        {
          title: "In Stock & Reserved Items",
          rows: table1Rows,
          columns: [
            { header: "Category", key: "Category" },
            { header: "Gem Type", key: "Gem Type" },
            { header: "Status", key: "Status" },
            { header: "Items", key: "Items" },
            { header: "Sell Value", key: "Sell Value" },
          ],
        },
        {
          title: "Sold & Memo Items",
          rows: table2Rows,
          columns: [
            { header: "Category", key: "Category" },
            { header: "Gem Type", key: "Gem Type" },
            { header: "Status", key: "Status" },
            { header: "Items", key: "Items" },
            { header: "Sell Value", key: "Sell Value" },
          ],
        },
        {
          title: "Overall Summary",
          rows: summaryRows,
          columns: [
            { header: "Metric", key: "Metric" },
            { header: "Items", key: "Items" },
          ],
        }
      ]
    };
  }, [data?.byCategoryGemType, overallStatusSummary]);

  const statCardClass = `rounded-2xl border bg-gradient-to-br from-card to-muted/30 shadow-sm transition-shadow hover:shadow-md ${isLoading ? "animate-pulse" : isValidating ? "opacity-70" : ""}`;

  const topCategory = (data?.byCategory || [])[0]?.category;
  const topGemType = (data?.byGemType || [])[0]?.gemType;
  const missingImages = data ? Math.max(0, (data.totalItems || 0) - (data.withImagesCount || 0)) : 0;
  const missingCertificates = data ? Math.max(0, (data.totalItems || 0) - (data.withCertificateCount || 0)) : 0;
  const imagesPct = data && data.totalItems ? Math.round((data.withImagesCount / data.totalItems) * 100) : 0;
  const certPct = data && data.totalItems ? Math.round((data.withCertificateCount / data.totalItems) * 100) : 0;

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Inventory Overview</h2>
        </div>
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-md p-4 text-sm">
          Failed to load inventory stats. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventory Overview</h2>
          <p className="text-sm text-muted-foreground">Updates automatically based on selected filters.</p>
        </div>
        <div className="flex flex-wrap gap-2 [&_button]:rounded-xl">
          <ExportButton
            filename="inventory_by_category"
            multiTable={categoryExport.multiTable}
            title="Inventory Summary (Category)"
            label="Export by Category"
          />
          <ExportButton
            filename="inventory_by_gem_type"
            multiTable={gemTypeExport.multiTable}
            title="Inventory Summary (Gem Type)"
            label="Export by Gem Type"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">Total Items<span className="rounded-lg bg-primary/10 p-2 text-primary"><Boxes className="h-4 w-4"/></span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{data?.overallTotalItems ?? data?.totalItems ?? "—"}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-emerald-600 dark:text-emerald-300">In Stock: {overallStatusSummary.inStock}</span>
              <span className="text-primary dark:text-primary">Sold: {overallStatusSummary.sold}</span>
              <span className="text-amber-600 dark:text-amber-300">Reserved: {overallStatusSummary.reserved}</span>
              <span className="text-violet-600 dark:text-violet-300">Memo: {overallStatusSummary.memo}</span>
            </div>
            {data?.overallTotalItems !== undefined && data?.overallTotalItems !== data?.totalItems && (
              <div className="text-[10px] text-muted-foreground mt-2">
                Filtered: {data?.totalItems ?? 0}
              </div>
            )}
            {(topCategory || topGemType) && (
              <div className="text-[10px] text-muted-foreground mt-2">
                {topCategory ? `Top Category: ${topCategory}` : null}
                {topCategory && topGemType ? " • " : null}
                {topGemType ? `Top Gem Type: ${topGemType}` : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">Total Sell Value<span className="rounded-lg bg-primary/10 p-2 text-primary"><CircleDollarSign className="h-4 w-4"/></span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{data ? formatCurrency(data.totalSell) : "—"}</div>
            <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
              <div>Avg Item Value: {data ? formatCurrency(data.avgSell) : "—"}</div>
              <div>Highest Item Price: {data ? formatCurrency(data.maxSell) : "—"}</div>
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">With Images<span className="rounded-lg bg-primary/10 p-2 text-primary"><ImageIcon className="h-4 w-4"/></span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">
              {data ? `${data.withImagesCount}/${data.totalItems}` : "—"}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${imagesPct}%` }}/></div>
            <div className="text-xs text-muted-foreground mt-2">
              {data ? `${imagesPct}% • Missing ${missingImages}` : "Items having image/media"}
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">With Certificate<span className="rounded-lg bg-primary/10 p-2 text-primary"><FileCheck className="h-4 w-4"/></span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">
              {data ? `${data.withCertificateCount}/${data.totalItems}` : "—"}
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-emerald-500 rounded-full" style={{ width: `${certPct}%` }}/></div>
            <div className="text-xs text-muted-foreground mt-2">
              {data ? `${certPct}% • Missing ${missingCertificates}` : "Certificate number/details present"}
            </div>
          </CardContent>
        </Card>

        <Card className={statCardClass}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">Inventory Aging<span className="rounded-lg bg-primary/10 p-2 text-primary"><Clock className="h-4 w-4"/></span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground">In Stock only</div>
            <div className="mt-2 flex flex-col gap-1 text-xs">
              <span className="text-emerald-600 dark:text-emerald-300">Fresh (0–30): {data?.aging?.fresh ?? 0}</span>
              <span className="text-amber-600 dark:text-amber-300">Slow (31–90): {data?.aging?.slow ?? 0}</span>
              <span className="text-red-600 dark:text-red-300">Dead (90+): {data?.aging?.dead ?? 0}</span>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
