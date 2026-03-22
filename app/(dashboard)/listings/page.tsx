import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Management | KhyatiGems™",
};

export default async function ListingsPage() {
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
    },
  });

  return (
    <div className="space-y-6">
      <ListingsView listings={listings} />
    </div>
  );
}
