import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Management | KhyatiGems™",
};

export default async function ListingsPage() {
  try {
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
        <ListingsView listings={listings} inventory={inventory} />
      </div>
    );
  } catch (error) {
    console.error("Listings Page Error:", error);
    return (
      <div className="p-4 text-red-500">
        Error loading listings. Please check server logs.
      </div>
    );
  }
}
