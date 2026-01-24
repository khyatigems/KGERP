import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export const metadata: Metadata = {
  title: "Edit Purchase | KhyatiGems™",
};

type EditPurchasePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditPurchasePage({
  params,
}: EditPurchasePageProps) {
  const { id } = await params;

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      items: true,
    },
  });

  if (!purchase) {
    notFound();
  }

  // Transform purchase items to match the expected interface
  const transformedPurchase = {
    ...purchase,
    vendorId: purchase.vendorId || "",
    items: purchase.items.map((item) => ({
      itemName: item.itemName,
      category: item.category || "Other",
      shape: item.shape || "",
      sizeValue: "", // Not in Inventory
      sizeUnit: "", // Not in Inventory
      beadSizeMm: item.beadSizeMm ?? null,
      weightType: item.weightUnit || "cts",
      quantity: item.pieces,
      costPerUnit: item.purchaseRatePerCarat || item.flatPurchaseCost || 0,
      totalCost: item.costPrice,
      remarks: item.notes || "",
    })),
  };

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
        <h1 className="text-3xl font-bold tracking-tight">Edit Purchase</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <PurchaseForm vendors={vendors} initialData={transformedPurchase} />
        </div>
      </div>
    </div>
  );
}
