import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getTopCategoriesData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function TopCategoriesReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getTopCategoriesData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Top Categories</h1>
      <Card>
        <CardHeader><CardTitle>Category Ranking and Contribution</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Profit</TableHead><TableHead className="text-right">Orders</TableHead><TableHead className="text-right">Contribution</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.category}-${idx}`}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.profit)}</TableCell>
                  <TableCell className="text-right">{row.orders}</TableCell>
                  <TableCell className="text-right">{row.contributionPct.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
