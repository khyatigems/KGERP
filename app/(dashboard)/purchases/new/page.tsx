import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { AnimatedPage } from "@/components/ui/animated-page";
import { getNextPurchaseNumber } from "@/lib/purchase-numbering";

export const metadata: Metadata = {
  title: "New Purchase | KhyatiGems™",
};

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const [vendors, categories, gemstones, colors, suggestedInvoiceNo] = await Promise.all([
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
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.gemstoneCode.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.colorCode.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    getNextPurchaseNumber(),
  ]);

  return (
    <AnimatedPage>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Record Purchase</h1>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow">
          <div className="p-6">
            <PurchaseForm
              vendors={vendors}
              categories={categories}
              gemstones={gemstones}
              colors={colors}
              suggestedInvoiceNo={suggestedInvoiceNo}
            />
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
