import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReplacementDispatchClient } from "@/components/sales-returns/replacement-dispatch-client";

export const dynamic = "force-dynamic";

export default async function SalesReturnReplacementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ customerName?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_CREATE)) redirect("/");

  const { id } = await params;
  const sp = await searchParams;
  const customerName = (sp.customerName || "").trim();
  const invs = await prisma.inventory.findMany({
    where: { status: "IN_STOCK" },
    select: { id: true, sku: true, itemName: true, sellingPrice: true },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Replacement Dispatch</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Select Items</CardTitle></CardHeader>
        <CardContent>
          <ReplacementDispatchClient salesReturnId={id} items={invs} customerName={customerName} />
        </CardContent>
      </Card>
    </div>
  );
}
