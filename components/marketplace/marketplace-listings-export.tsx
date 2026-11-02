"use client";

import { Button } from "@/components/ui/button";
import { exportToExcel, exportToPDF } from "@/lib/export";

export type MarketplaceListingExportRow = {
  marketplace: string; shop: string; listingId: string; sku: string; title: string;
  previousPrice: string; priceObservedAt: string; views: string; favorites: string; impressions: string; soldQuantity: string; viewsPeriod: string; imageUrl: string; category: string;
  price: string; quantity: string; status: string; syncStatus: string; lastSynced: string; listingUrl: string;
};

const columns = [
  { header: "Marketplace", key: "marketplace" }, { header: "Shop", key: "shop" },
  { header: "Listing ID", key: "listingId" }, { header: "ERP / Marketplace SKU", key: "sku" },
  { header: "Title", key: "title" }, { header: "Price", key: "price" },
  { header: "Quantity", key: "quantity" }, { header: "Status", key: "status" },
  { header: "Match status", key: "syncStatus" }, { header: "Last synced (IST)", key: "lastSynced" },
  { header: "Previous price", key: "previousPrice" }, { header: "Price observed (IST)", key: "priceObservedAt" },
  { header: "Views", key: "views" }, { header: "View period", key: "viewsPeriod" }, { header: "Favorites / Watchers", key: "favorites" },
  { header: "Impressions (eBay)", key: "impressions" }, { header: "Sold quantity (eBay)", key: "soldQuantity" },
  { header: "Image URL", key: "imageUrl" }, { header: "Category", key: "category" },
  { header: "Listing URL", key: "listingUrl" },
] as const;

export function MarketplaceListingsExport({ rows }: { rows: MarketplaceListingExportRow[] }) {
  return <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, [...columns], "marketplace-listings", "Marketplace Listings")}>Export Excel</Button>
    <Button variant="outline" size="sm" onClick={() => void exportToPDF(rows, [...columns], "marketplace-listings", "Marketplace Listings")}>Export PDF</Button>
  </div>;
}
