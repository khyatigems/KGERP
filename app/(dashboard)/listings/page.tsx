import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Listings Management | KhyatiGems™",
};

export default async function ListingsPage() {
  let data = null;
  let errorObj: Error | unknown = null;

  const fetchData = async () => {
    return Promise.all([
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
  };

  try {
    const [listings, inventory] = await fetchData();
    data = { listings, inventory };
  } catch (error) {
    console.error("Listings Page Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Self-healing: Check for orphan listings (Listing pointing to non-existent Inventory)
    if (errorMessage.includes("Field inventory is required") || errorMessage.includes("Inconsistent query result")) {
      console.warn("Orphan listings detected. Attempting cleanup...");
      try {
        const allListings = await prisma.listing.findMany({
          select: { id: true, inventoryId: true }
        });
        
        const inventoryIds = [...new Set(allListings.map(l => l.inventoryId))];
        const existingInventory = await prisma.inventory.findMany({
          where: { id: { in: inventoryIds } },
          select: { id: true }
        });
        
        const existingInventoryIds = new Set(existingInventory.map(i => i.id));
        const orphanListingIds = allListings
          .filter(l => !existingInventoryIds.has(l.inventoryId))
          .map(l => l.id);
          
        if (orphanListingIds.length > 0) {
          console.log(`Deleting ${orphanListingIds.length} orphan listings...`);
          await prisma.listing.deleteMany({
            where: { id: { in: orphanListingIds } }
          });
          console.log("Cleanup complete. Retrying fetch...");
          
          // Retry fetch
          const [listings, inventory] = await fetchData();
          data = { listings, inventory };
        } else {
            // If no orphans found but error persists, it might be something else.
            errorObj = error;
        }
      } catch (cleanupError) {
        console.error("Cleanup failed:", cleanupError);
        errorObj = cleanupError; // Show cleanup error if that fails
      }
    } else {
        errorObj = error;
    }
  }

  if (errorObj) {
    const errorMessage = errorObj instanceof Error ? errorObj.message : String(errorObj);
    return (
      <div className="p-4 text-red-500">
        <h3 className="font-bold">Error loading listings</h3>
        <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
          {errorMessage || JSON.stringify(errorObj, null, 2)}
        </pre>
        <p className="mt-2 text-sm text-gray-600">Please check server logs for more details.</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <ListingsView listings={data.listings} inventory={data.inventory} />
    </div>
  );
}
