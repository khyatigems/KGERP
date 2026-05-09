import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { cachedMasters } from "@/lib/cache";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Add Inventory | KhyatiGems™",
};

export default async function NewInventoryPage() {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
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

  const [vendors, categories, gemstones, colors, collections, rashis, cuts, certificates] = await Promise.all([
    cachedMasters.getApprovedVendors(prisma)(),
    cachedMasters.getCategories(prisma)(),
    cachedMasters.getGemstones(prisma)(),
    cachedMasters.getColors(prisma)(),
    cachedMasters.getCollections(prisma)(),
    cachedMasters.getRashis(prisma)(),
    cachedMasters.getCuts(prisma)(),
    cachedMasters.getCertificates(prisma)(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add New Item</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <InventoryForm
            vendors={vendors}
            categories={categories}
            gemstones={gemstones}
            colors={colors}
            collections={collections}
            rashis={rashis}
            cuts={cuts}
            certificates={certificates}
          />
        </div>
      </div>
    </div>
  );
}
