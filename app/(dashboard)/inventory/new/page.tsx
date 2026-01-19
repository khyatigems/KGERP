import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { InventoryForm } from "@/components/inventory/inventory-form";

export const metadata: Metadata = {
  title: "Add Inventory | Khyati Gems",
};

export default async function NewInventoryPage() {
  const [vendors, categories, gemstones, colors] = await Promise.all([
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
          />
        </div>
      </div>
    </div>
  );
}
