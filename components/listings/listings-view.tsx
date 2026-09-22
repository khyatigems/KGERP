"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingsTable } from "./listings-table";
import { MarketplaceOrdersTable, type MarketplaceOrderRow } from "./orders-table";
import { CreateListingsTable } from "./create-listings-table";
import { ListingTemplates } from "./listing-templates";
import { Listing } from "@prisma/client";
import { useTransition, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { syncListingsAction, syncOrdersAction } from "@/app/(dashboard)/listings/actions";

type EngagementMetric = {
  id: string;
  inventoryId: string;
  marketplace: string;
  externalId: string | null;
  currentViews: number;
  currentWatches: number;
  currentFavourites: number;
  currentOrders: number;
  currentRevenue: number;
  currency: string;
  lastSyncedAt: Date | null;
  updatedAt: Date;
};

export type EnrichedListing = Listing & {
  inventory: { sku: string; itemName: string } | null;
  priceHistory: { price: number; changedAt: Date }[];
  latestMetric: EngagementMetric | null;
  profitMargin: number | null;
  profitAmount: number | null;
};

interface ListingsViewProps {
  listings: EnrichedListing[];
  orders?: MarketplaceOrderRow[];
}

function SyncButton({
  label,
  onClick,
  disabled = false,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "outline";
}) {
  const [isPending, startTransition] = useTransition();

  const baseClass = "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClass = variant === "outline"
    ? "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
    : "bg-primary text-primary-foreground hover:bg-primary/90";

  return (
    <button
      onClick={() => {
        startTransition(() => onClick());
      }}
      disabled={disabled || isPending}
      className={`${baseClass} ${variantClass}`}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      <span>{label}</span>
    </button>
  );
}

export function ListingsView({ listings, orders = [] }: ListingsViewProps) {
  const hasMetrics = listings.some((l) => l.latestMetric !== null);

  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = async (type: "listings" | "orders", platform: "EBAY" | "ETSY") => {
    const key = `${platform}-${type}`;
    setSyncing(key);
    try {
      const fd = new FormData();
      fd.set("platform", platform);
      if (type === "listings") {
        await syncListingsAction(fd);
      } else {
        await syncOrdersAction(fd);
      }
      toast.success(`${platform} ${type} sync completed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `${platform} sync failed`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Listings Management</h1>
        <div className="flex flex-wrap items-center gap-2">
          <SyncButton
            label="eBay Listings"
            onClick={() => handleSync("listings", "EBAY")}
            disabled={syncing !== null}
          />
          <SyncButton
            label="eBay Orders"
            onClick={() => handleSync("orders", "EBAY")}
            disabled={syncing !== null}
            variant="outline"
          />
          <div className="h-6 w-px bg-border" />
          <SyncButton
            label="Etsy Listings"
            onClick={() => handleSync("listings", "ETSY")}
            disabled={syncing !== null}
          />
          <SyncButton
            label="Etsy Orders"
            onClick={() => handleSync("orders", "ETSY")}
            disabled={syncing !== null}
            variant="outline"
          />
        </div>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Listings</TabsTrigger>
          <TabsTrigger value="orders">Marketplace Orders ({orders.length})</TabsTrigger>
          <TabsTrigger value="create">Create Listings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <ListingsTable data={listings} showEngagement={hasMetrics} />
        </TabsContent>
        <TabsContent value="orders">
          <MarketplaceOrdersTable data={orders} />
        </TabsContent>
        <TabsContent value="create">
          <CreateListingsTable />
        </TabsContent>
        <TabsContent value="templates">
          <ListingTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
}
