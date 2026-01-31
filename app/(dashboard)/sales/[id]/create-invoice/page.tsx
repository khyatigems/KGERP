
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CreateInvoiceForm } from "@/components/invoices/create-invoice-form";

export const metadata: Metadata = {
  title: "Create Invoice | KhyatiGems™",
};

export default async function CreateInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { invoice: true }
  });

  if (!sale) notFound();

  let initialOptions = {
    showWeight: true,
    showRatti: true,
    showDimensions: true,
    showGemType: true,
    showCategory: true,
    showColor: true,
    showShape: true,
    showRashi: true,
    showCertificates: true,
    showSku: true,
    showPrice: true,
  };

  if (sale.invoice?.displayOptions) {
    try {
      const parsed = JSON.parse(sale.invoice.displayOptions);
      initialOptions = { ...initialOptions, ...parsed };
    } catch (e) {
      console.error("Failed to parse display options", e);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Invoice Configuration</h1>
        <p className="text-muted-foreground">
          Select the fields you want to display on the invoice for Sale #{sale.id.substring(0, 8).toUpperCase()}.
        </p>
      </div>
      <div className="rounded-xl border bg-card text-card-foreground shadow">
        <div className="p-6">
          <CreateInvoiceForm saleId={sale.id} initialOptions={initialOptions} />
        </div>
      </div>
    </div>
  );
}
