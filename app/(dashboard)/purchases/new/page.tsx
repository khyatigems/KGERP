import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export const metadata: Metadata = {
  title: "New Purchase | KhyatiGems™",
};

export default async function NewPurchasePage() {
  const vendors = await prisma.vendor.findMany({
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
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Record Purchase</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <PurchaseForm vendors={vendors} />
        </div>
      </div>
    </div>
  );
}
