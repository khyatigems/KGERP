import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotes/quotation-form";

export const metadata: Metadata = {
  title: "New Quotation | Khyati Gems",
};

export default async function NewQuotationPage() {
  const availableItems = await prisma.inventory.findMany({
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
        <h1 className="text-3xl font-bold tracking-tight">Create Quotation</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <QuotationForm availableItems={availableItems} />
        </div>
      </div>
    </div>
  );
}
