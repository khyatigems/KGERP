import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesReturnForm } from "@/components/sales-returns/sales-return-form";
import { computeInvoiceGst } from "@/lib/invoice-gst";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) redirect("/");

  const company = await prisma.companySettings.findFirst({ select: { address: true } });
  const invoiceSettings = await prisma.invoiceSettings.findFirst({ select: { categoryGstRates: true } });
  const gstRates = (() => {
    try {
      const raw = invoiceSettings?.categoryGstRates;
      if (!raw) return undefined;
      const parsed = JSON.parse(raw) as Record<string, string>;
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  })();

  const invoices = await prisma.invoice.findMany({
    where: { isActive: true },
    orderBy: { invoiceDate: "desc" },
    take: 250,
    include: {
      sales: {
        orderBy: { saleDate: "desc" },
        include: { inventory: { select: { id: true, sku: true, itemName: true, category: true } } },
      },
    },
  });

  const invoiceOptions = invoices.map((inv) => {
    const displayOptions = (() => {
      try {
        return inv.displayOptions ? (JSON.parse(inv.displayOptions) as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    })();
    const gst = computeInvoiceGst({
      items: inv.sales.map((s) => ({
        salePrice: s.salePrice,
        netAmount: s.netAmount,
        discountAmount: s.discountAmount,
        inventory: { category: s.inventory.category, itemName: s.inventory.itemName },
      })),
      gstRates,
      displayOptions,
    });
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      placeOfSupply: inv.sales?.[0]?.placeOfSupply || inv.sales?.[0]?.customerCity || "",
      items: inv.sales.map((s, idx) => {
        const line = (gst.processedItems || [])[idx] as unknown as { finalInclusive?: number; gstRate?: number };
        return {
          inventoryId: s.inventoryId,
          sku: s.inventory.sku,
          itemName: s.inventory.itemName,
          sellingPrice: Number(line?.finalInclusive ?? s.netAmount ?? s.salePrice ?? 0),
          gstRate: Number(line?.gstRate ?? 3),
          quantity: 1,
        };
      }),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Sales Return</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Return Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesReturnForm invoices={invoiceOptions} companyState="" />
        </CardContent>
      </Card>
    </div>
  );
}
