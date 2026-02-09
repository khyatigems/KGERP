"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListingsTable } from "./listings-table";
import { CreateListingsTable } from "./create-listings-table";
import { ListingTemplates } from "./listing-templates";
import { Inventory, Listing } from "@prisma/client";

interface ListingsViewProps {
  listings: (Listing & { inventory: { sku: string; itemName: string } })[];
  inventory: (Inventory & { listings: { platform: string }[] })[];
}

export function ListingsView({ listings, inventory }: ListingsViewProps) {
  return (
    <Tabs defaultValue="active" className="space-y-4">
      <TabsList>
        <TabsTrigger value="active">Active Listings</TabsTrigger>
        <TabsTrigger value="create">Create Listings</TabsTrigger>
        <TabsTrigger value="templates">Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <ListingsTable data={listings} />
      </TabsContent>
      <TabsContent value="create">
        <CreateListingsTable data={inventory} />
      </TabsContent>
      <TabsContent value="templates">
        <ListingTemplates />
      </TabsContent>
    </Tabs>
  );
}
