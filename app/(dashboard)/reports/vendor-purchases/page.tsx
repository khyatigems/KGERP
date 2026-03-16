import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getVendorPurchasesData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function VendorPurchasesReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getVendorPurchasesData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendor Purchases</h1>
      <Card>
        <CardHeader><CardTitle>Purchase Order Status and Value</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Purchase Value</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.vendor}-${row.status}-${idx}`}>
                  <TableCell>{row.vendor}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.purchaseValue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
