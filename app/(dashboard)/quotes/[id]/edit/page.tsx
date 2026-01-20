import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { QuotationForm } from "@/components/quotes/quotation-form";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Edit Quotation | KhyatiGems™",
};

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
        items: true
    }
  });

  if (!quotation) notFound();
  if (quotation.status !== "ACTIVE") {
      return <div className="p-6 text-red-500">Only ACTIVE quotations can be edited.</div>;
  }

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
        <h1 className="text-3xl font-bold tracking-tight">Edit Quotation</h1>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <QuotationForm availableItems={availableItems} initialData={quotation} />
        </div>
      </div>
    </div>
  );
}
