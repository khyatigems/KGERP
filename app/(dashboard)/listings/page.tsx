import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";

export const metadata: Metadata = {
  title: "Listings Management | Khyati Gems",
};

export default async function ListingsPage() {
  const [listings, inventory] = await Promise.all([
    prisma.listing.findMany({
      orderBy: { listedDate: "desc" },
      include: {
        inventory: {
          select: {
            sku: true,
            itemName: true,
          },
        },
      },
    }),
    prisma.inventory.findMany({
      where: {
        status: "IN_STOCK",
      },
      include: {
        listings: {
          select: {
            platform: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Listings Management</h1>
      </div>
      <ListingsView listings={listings} inventory={inventory} />
    </div>
  );
}
