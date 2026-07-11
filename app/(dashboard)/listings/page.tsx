import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { AnimatedPage } from "@/components/ui/animated-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Management | KhyatiGems™",
};

export default async function ListingsPage() {
  const perm = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

  await ensureInventoryBraceletSchema();
  const listings = await prisma.listing.findMany({
    orderBy: { listedDate: "desc" },
    include: {
      inventory: {
        select: {
          sku: true,
          itemName: true,
        },
      },
      priceHistory: {
        orderBy: { changedAt: "asc" },
        take: 1,
      },
    },
  });

  // Fetch latest engagement metrics for all listings
  const inventoryIds = Array.from(new Set(listings.map((l) => l.inventoryId)));
  const latestMetrics = inventoryIds.length
    ? await prisma.listingOpportunity.findMany({
        where: { inventoryId: { in: inventoryIds } }
      })
    : [];
  const metricsByKey = new Map(
    latestMetrics.map((m) => [`${m.inventoryId}|${m.marketplace}`, m])
  );

  // Attach metrics to each listing
  const enrichedListings = listings.map((l) => ({
    ...l,
    latestMetric: metricsByKey.get(`${l.inventoryId}|${l.platform}`) || null
  }));

  return (
    <AnimatedPage>
    <div className="space-y-6">
      <ListingsView listings={enrichedListings} />
    </div>
    </AnimatedPage>
  );
}
