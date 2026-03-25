import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";
import { ensureReturnsSchema } from "@/lib/returns-schema-ensure";

export const dynamic = "force-dynamic";

export default async function SalesReturnsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_VIEW)) redirect("/");

  await ensureReturnsSchema();

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; returnNumber: string; returnDate: string; disposition: string; invoiceNumber: string }>
  >(
    `SELECT sr.id, sr.returnNumber, sr.returnDate, sr.disposition, i.invoiceNumber
     FROM SalesReturn sr
     JOIN Invoice i ON i.id = sr.invoiceId
     ORDER BY sr.returnDate DESC
     LIMIT 200`
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Returns</h1>
          <p className="text-sm text-muted-foreground">Create returns and credit notes against invoices.</p>
        </div>
        {hasPermission(session.user.role, PERMISSIONS.SALES_CREATE) && (
          <Button asChild>
            <Link href="/sales-returns/new">
              <Plus className="mr-2 h-4 w-4" />
              New Return
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Disposition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No sales returns yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r: { id: string; returnNumber: string; returnDate: string; disposition: string; invoiceNumber: string }) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.returnNumber}</TableCell>
                      <TableCell>{formatDate(r.returnDate)}</TableCell>
                      <TableCell>{r.invoiceNumber}</TableCell>
                      <TableCell>{r.disposition}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
