import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { ensureSalesReturnReplacementSchema, prisma } from "@/lib/prisma";
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
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.SALES_CREATE))) redirect("/");

  const { id } = await params;
  const sp = await searchParams;
  const customerName = (sp.customerName || "").trim();

  await ensureSalesReturnReplacementSchema();
  const map = await prisma.$queryRawUnsafe<Array<{ invoiceId: string; memoId: string | null }>>(
    `SELECT invoiceId, memoId FROM "SalesReturnReplacement" WHERE salesReturnId = ? LIMIT 1`,
    id
  );
  const existing = map?.[0];
  if (existing?.invoiceId) {
    const inv = await prisma.invoice.findUnique({ where: { id: existing.invoiceId }, select: { id: true, invoiceNumber: true } });
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Replacement Dispatch</h1>
        <div className="p-4 rounded-md border bg-card">
          Replacement already created for this Sales Return: <span className="font-semibold">{inv?.invoiceNumber || "REPLACEMENT"}</span>
        </div>
      </div>
    );
  }
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
