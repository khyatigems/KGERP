import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { InventoryForm } from "@/components/inventory/inventory-form";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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
    prisma.categoryCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.gemstoneCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.colorCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.collectionCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.rashiCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.cutCode.findMany({ 
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" } 
    }),
    prisma.certificateCode.findMany({
        where: { status: "ACTIVE" },
        orderBy: { name: "asc" }
    })
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
