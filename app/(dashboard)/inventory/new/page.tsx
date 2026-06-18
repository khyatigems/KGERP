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

  const [vendors, categories, gemstones, colors, collections, rashis, cuts, certificates, originRows] = await Promise.all([
    cachedMasters.getApprovedVendors(prisma)(),
    cachedMasters.getCategories(prisma)(),
    cachedMasters.getGemstones(prisma)(),
    cachedMasters.getColors(prisma)(),
    cachedMasters.getCollections(prisma)(),
    cachedMasters.getRashis(prisma)(),
    cachedMasters.getCuts(prisma)(),
    cachedMasters.getCertificates(prisma)(),
    prisma.$queryRawUnsafe<Array<{ origin: string }>>(`SELECT DISTINCT "origin" FROM "Inventory" WHERE "origin" IS NOT NULL AND "origin" <> '' ORDER BY "origin"`),
  ]);
  const origins = originRows.map((r) => r.origin);

  const gpisSettings = await (prisma as any).gpisSettings.findFirst();
  const categoryHsnMap: Record<string, string> = {};
  if (gpisSettings?.categoryHsnJson) {
    try {
      const parsed = JSON.parse(String(gpisSettings.categoryHsnJson));
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
            categoryHsnMap[k.trim()] = v.trim();
          }
        }
      }
    } catch {}
  }

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
            origins={origins}
            categoryHsnMap={categoryHsnMap}
          />
        </div>
      </div>
    </div>
  );
}
