import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { cachedMasters } from "@/lib/cache";
import { InventoryForm } from "@/components/inventory/inventory-form";

export const metadata: Metadata = {
  title: "Edit Inventory | KhyatiGems™",
};

type EditInventoryPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function getInventoryData(id: string) {
  try {
    const data = await Promise.all([
      prisma.inventory.findUnique({
        where: { id },
        include: { 
          media: true, 
          rashis: { select: { id: true } },
          certificates: { select: { id: true } },
          categoryCode: true,
          gemstoneCode: true,
          colorCode: true,
          cutCode: true,
          collectionCode: true
        },
      }),
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
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

export default async function EditInventoryPage({ params }: EditInventoryPageProps) {
  const { id } = await params;
  const result = await getInventoryData(id);

  if (!result.success) {
    const error = result.error;
    console.error("Error loading inventory for edit:", error);
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-3xl font-bold tracking-tight text-destructive">Error Loading Inventory</h1>
        <div className="p-4 border border-destructive/20 rounded-md bg-destructive/10 text-destructive">
          <p className="font-semibold">A database error occurred:</p>
          <pre className="mt-2 text-xs overflow-auto whitespace-pre-wrap">
            {error instanceof Error ? (error as Error).message : String(error)}
          </pre>
          <p className="mt-4 text-sm text-muted-foreground">
            Please check your database connection or try again later.
          </p>
        </div>
      </div>
    );
  }

  const [inventory, vendors, categories, gemstones, colors, collections, rashis, cuts, certificates, originRows] = result.data!;
  const origins = originRows.map((r: { origin: string }) => r.origin);

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

  if (!inventory) {
      notFound();
  }
  
  if (inventory.status === "SOLD") {
      return (
          <div className="space-y-6">
             <h1 className="text-3xl font-bold tracking-tight">Edit Inventory</h1>
             <div className="p-6 border rounded-xl bg-muted text-center">
                 <p>This item has been sold and cannot be edited.</p>
             </div>
          </div>
      );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Inventory</h1>
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
            initialData={inventory} 
            categoryHsnMap={categoryHsnMap}
          />
        </div>
      </div>
    </div>
  );
}
