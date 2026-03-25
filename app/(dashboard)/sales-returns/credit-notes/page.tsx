import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditNotesTable } from "../../../../components/sales-returns/credit-notes-table";

export const dynamic = "force-dynamic";

export default async function CreditNotesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.RECEIVABLES_VIEW)) redirect("/");

  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      creditNoteNumber: string;
      issueDate: string;
      activeUntil: string | null;
      totalAmount: number;
      balanceAmount: number;
      isActive: number;
      invoiceNumber: string | null;
      customerName: string | null;
    }>
  >(
    `SELECT cn.id,
            cn.creditNoteNumber,
            cn.issueDate,
            cn.activeUntil,
            cn.totalAmount,
            cn.balanceAmount,
            cn.isActive,
            i.invoiceNumber as invoiceNumber,
            c.name as customerName
     FROM CreditNote cn
     LEFT JOIN Invoice i ON i.id = cn.invoiceId
     LEFT JOIN Customer c ON c.id = cn.customerId
     ORDER BY cn.issueDate DESC
     LIMIT 300`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Credit Notes</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Active / Expired / Inactive</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditNotesTable initialRows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
