import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getSalesCycleData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function SalesCycleReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const data = await getSalesCycleData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sales Cycle</h1>
      <Card><CardHeader><CardTitle>Average Sales Cycle</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data.avgCycle.toFixed(1)} days</div></CardContent></Card>
      <Card>
        <CardHeader><CardTitle>Cycle by Sold SKU</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Cycle Days</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{row.cycleDays}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.margin)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
