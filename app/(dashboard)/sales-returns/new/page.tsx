import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesReturnForm } from "@/components/sales-returns/sales-return-form";

export const dynamic = "force-dynamic";

export default async function NewSalesReturnPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_MANAGE)) redirect("/");

  const invoices = await prisma.invoice.findMany({
    where: { isActive: true },
    orderBy: { invoiceDate: "desc" },
    take: 250,
    include: {
      sales: {
        orderBy: { saleDate: "desc" },
        include: { inventory: { select: { id: true, sku: true, itemName: true } } },
      },
    },
  });

  const invoiceOptions = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    items: inv.sales.map((s) => ({
      inventoryId: s.inventoryId,
      sku: s.inventory.sku,
      itemName: s.inventory.itemName,
      sellingPrice: s.salePrice || s.netAmount || 0,
      quantity: 1,
    })),
  }));

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
          <SalesReturnForm invoices={invoiceOptions} />
        </CardContent>
      </Card>
    </div>
  );
}

