"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ExportButton } from "@/components/ui/export-button";

type StatRow = { totalItems: number; totalCost: number; totalSell: number; lowStockCount: number; recentAddedCount: number };
type ByCategoryRow = { category: string; items: number; costValue: number; sellValue: number };
type ByGemTypeRow = { gemType: string; items: number; costValue: number; sellValue: number };
type ByStatusRow = { status: string; items: number };

type InventoryStatsResponse = StatRow & {
  byCategory: ByCategoryRow[];
  byGemType: ByGemTypeRow[];
  byStatus: ByStatusRow[];
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function InventoryStats() {
  const searchParams = useSearchParams();
  const qs = searchParams.toString();
  const url = `/api/inventory/stats${qs ? `?${qs}` : ""}`;

  const { data, isLoading, isValidating } = useSWR<InventoryStatsResponse>(url, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const categoryExport = useMemo(() => {
    const rows = (data?.byCategory || []).map((r) => ({
      Category: r.category,
      Items: r.items,
      "Cost Value": r.costValue,
      "Sell Value": r.sellValue,
    }));
    const columns = [
      { header: "Category", key: "Category" },
      { header: "Items", key: "Items" },
      { header: "Cost Value", key: "Cost Value" },
      { header: "Sell Value", key: "Sell Value" },
    ];
    return { rows, columns };
  }, [data?.byCategory]);

  const gemTypeExport = useMemo(() => {
    const rows = (data?.byGemType || []).map((r) => ({
      "Gem Type": r.gemType,
      Items: r.items,
      "Cost Value": r.costValue,
      "Sell Value": r.sellValue,
    }));
    const columns = [
      { header: "Gem Type", key: "Gem Type" },
      { header: "Items", key: "Items" },
      { header: "Cost Value", key: "Cost Value" },
      { header: "Sell Value", key: "Sell Value" },
    ];
    return { rows, columns };
  }, [data?.byGemType]);

  const statusSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of data?.byStatus || []) map.set(r.status, r.items);
    return {
      inStock: map.get("IN_STOCK") || 0,
      reserved: map.get("RESERVED") || 0,
      memo: map.get("MEMO") || 0,
      sold: map.get("SOLD") || 0,
    };
  }, [data?.byStatus]);

  const topCategory = (data?.byCategory || [])[0]?.category;
  const topGemType = (data?.byGemType || [])[0]?.gemType;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Inventory Overview</h2>
          <p className="text-sm text-muted-foreground">Updates automatically based on selected filters.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton
            filename="inventory_by_category"
            data={categoryExport.rows}
            columns={categoryExport.columns}
            title="Inventory Summary (Category)"
            label="Export by Category"
          />
          <ExportButton
            filename="inventory_by_gem_type"
            data={gemTypeExport.rows}
            columns={gemTypeExport.columns}
            title="Inventory Summary (Gem Type)"
            label="Export by Gem Type"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className={isLoading ? "animate-pulse" : `transition-all duration-300 animate-in fade-in ${isValidating ? "opacity-70" : "opacity-100"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalItems ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">
              IN_STOCK {statusSummary.inStock} • RESERVED {statusSummary.reserved} • MEMO {statusSummary.memo}
            </div>
            {(topCategory || topGemType) && (
              <div className="text-[10px] text-muted-foreground mt-2">
                {topCategory ? `Top Category: ${topCategory}` : null}
                {topCategory && topGemType ? " • " : null}
                {topGemType ? `Top Gem Type: ${topGemType}` : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={isLoading ? "animate-pulse" : `transition-all duration-300 animate-in fade-in ${isValidating ? "opacity-70" : "opacity-100"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Cost Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? formatCurrency(data.totalCost) : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">Sum of Cost Price</div>
          </CardContent>
        </Card>

        <Card className={isLoading ? "animate-pulse" : `transition-all duration-300 animate-in fade-in ${isValidating ? "opacity-70" : "opacity-100"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Sell Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? formatCurrency(data.totalSell) : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">Sum of Selling Price</div>
          </CardContent>
        </Card>

        <Card className={isLoading ? "animate-pulse" : `transition-all duration-300 animate-in fade-in ${isValidating ? "opacity-70" : "opacity-100"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data ? data.lowStockCount : "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">Low stock • Recent +{data ? data.recentAddedCount : "—"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
