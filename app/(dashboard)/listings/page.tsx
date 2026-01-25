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
    data = { listings, inventory };
  } catch (error) {
    console.error("Listings Page Error:", error);
    errorObj = error;
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
