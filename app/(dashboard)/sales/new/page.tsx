import { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SaleForm } from "@/components/sales/sale-form";

export const metadata: Metadata = {
  title: "New Sale | KhyatiGems™",
};

export default async function NewSalePage() {
  const inventoryItems = await prisma.inventory.findMany({
    where: {
      status: "IN_STOCK",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Record New Sale</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <Suspense fallback={<div>Loading form...</div>}>
             <SaleForm inventoryItems={inventoryItems} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
