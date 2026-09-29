"use client";

import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF } from "@/lib/export";

export type MarketplaceOrderExportRow = {
  marketplace: string; shop: string; orderId: string; orderNumber: string; customer: string;
  items: string; total: string; status: string; orderDate: string; lastSynced: string;
};

const columns = [
  { header: "Marketplace", key: "marketplace" }, { header: "Shop", key: "shop" },
  { header: "External order ID", key: "orderId" }, { header: "Order number", key: "orderNumber" },
  { header: "Customer", key: "customer" }, { header: "Items", key: "items" },
  { header: "Total", key: "total" }, { header: "Status", key: "status" },
  { header: "Order date (IST)", key: "orderDate" }, { header: "Last synced (IST)", key: "lastSynced" },
] as const;

export function MarketplaceOrdersExport({ rows }: { rows: MarketplaceOrderExportRow[] }) {
  return <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, [...columns], "marketplace-orders", "Marketplace Orders")}>Export Excel</Button>
    <Button variant="outline" size="sm" onClick={() => void exportToPDF(rows, [...columns], "marketplace-orders", "Marketplace Orders")}>Export PDF</Button>
  </div>;
}
