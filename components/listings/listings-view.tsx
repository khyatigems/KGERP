"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingsTable } from "./listings-table";
import { CreateListingsTable } from "./create-listings-table";
import { ListingTemplates } from "./listing-templates";
import { Listing } from "@prisma/client";

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
  inventory: { sku: string; itemName: string };
  priceHistory: { price: number; changedAt: Date }[];
  latestMetric: EngagementMetric | null;
};

interface ListingsViewProps {
  listings: EnrichedListing[];
}

export function ListingsView({ listings }: ListingsViewProps) {
  // Check if any listing has engagement data
  const hasMetrics = listings.some((l) => l.latestMetric !== null);

  return (
    <Tabs defaultValue="active" className="space-y-4">
      <TabsList>
        <TabsTrigger value="active">Active Listings</TabsTrigger>
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
  );
}
