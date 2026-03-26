import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { ListingsView } from "@/components/listings/listings-view";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

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
    },
  });

  return (
    <div className="space-y-6">
      <ListingsView listings={listings} />
    </div>
  );
}
