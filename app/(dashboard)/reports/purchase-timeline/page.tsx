import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getPurchaseTimelineData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function PurchaseTimelineReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/reports");
  const rows = await getPurchaseTimelineData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Purchase Timeline</h1>
      <Card>
        <CardHeader><CardTitle>Customer Purchase Journey and RFM</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">RFM</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{new Date(row.saleDate).toLocaleDateString()}</TableCell>
                  <TableCell>{row.customerName || "Unknown"}</TableCell>
                  <TableCell>{row.customerPhone || "-"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.netAmount || 0)}</TableCell>
                  <TableCell className="text-right">{row.rfmScore}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
