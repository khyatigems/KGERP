"use client";

import useSWR from "swr";
import { useMemo } from "react";
import { InventoryStatsSummary } from "./inventory-stats-summary";
import { ExportButton } from "@/components/ui/export-button";

type StatRow = { totalItems: number; overallTotalItems: number; totalSell: number };
type ByCategoryRow = { category: string; status: string; items: number; sellValue: number };
type ByGemTypeRow = { gemType: string; status: string; items: number; sellValue: number };
type ByCategoryGemTypeRow = { category: string; gemType: string; status: string; items: number; sellValue: number };
type ByStatusRow = { status: string; items: number };

export type InventoryStatsResponse = StatRow & {
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

export function InventoryStats({ searchParams, exportsOnly = false }: { searchParams: Record<string, string | undefined>; exportsOnly?: boolean }) {
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

  if (exportsOnly) {
    if (!data || error) return <span role="status" className="text-xs text-muted-foreground">{error ? "Summary exports unavailable" : "Loading exports…"}</span>;
    return (
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
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-destructive/15 text-destructive border border-destructive/20 rounded-md p-4 text-sm">
          Failed to load inventory stats. Please try again.
        </div>
      </div>
    );
  }

  return <InventoryStatsSummary data={data} loading={isLoading} refreshing={isValidating} />;
}
