"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingsTable } from "./listings-table";
import { CreateListingsTable } from "./create-listings-table";
import { ListingTemplates } from "./listing-templates";
import { Listing } from "@prisma/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
}

export function ListingsView({ listings }: ListingsViewProps) {
  const hasMetrics = listings.some((l) => l.latestMetric !== null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog Listing Tools</h1>
        <Button asChild variant="outline"><Link href="/marketplace-listings">Marketplace Listings</Link></Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Listing Records</TabsTrigger>
          <TabsTrigger value="create">Create Listings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="active">
          <ListingsTable data={listings} showEngagement={hasMetrics} />
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
