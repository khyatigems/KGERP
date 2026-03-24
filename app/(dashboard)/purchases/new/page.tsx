import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";

export const metadata: Metadata = {
  title: "New Purchase | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const prefix = "KGP-";
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


  const existing = await prisma.purchase.findMany({
    where: { invoiceNo: { startsWith: prefix } },
    select: { invoiceNo: true },
  });
  let max = 0;
  for (const row of existing) {
    const raw = (row.invoiceNo || "").trim();
    if (!raw.startsWith(prefix)) continue;
    const n = Number(raw.slice(prefix.length));
    if (Number.isFinite(n) && n > max) max = n;
  }
  const suggestedInvoiceNo = `${prefix}${String(max + 1).padStart(3, "0")}`;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Record Purchase</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <PurchaseForm vendors={vendors} suggestedInvoiceNo={suggestedInvoiceNo} />
        </div>
      </div>
    </div>
  );
}
