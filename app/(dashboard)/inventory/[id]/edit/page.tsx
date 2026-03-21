import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { ensureInventoryBraceletSchema } from "@/lib/inventory-schema-ensure";

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
    await ensureInventoryBraceletSchema();
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
      prisma.vendor.findMany({
        where: {
          status: "APPROVED",
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.categoryCode.findMany({ orderBy: { name: "asc" } }),
      prisma.gemstoneCode.findMany({ orderBy: { name: "asc" } }),
      prisma.colorCode.findMany({ orderBy: { name: "asc" } }),
      prisma.collectionCode.findMany({ orderBy: { name: "asc" } }),
      prisma.rashiCode.findMany({ orderBy: { name: "asc" } }),
      prisma.cutCode.findMany({ orderBy: { name: "asc" } }),
      prisma.certificateCode.findMany({ orderBy: { name: "asc" } }),
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

  const [inventory, vendors, categories, gemstones, colors, collections, rashis, cuts, certificates] = result.data!;

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
            initialData={inventory} 
          />
        </div>
      </div>
    </div>
  );
}
