import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCapitalRotationAnalytics } from "@/lib/reports-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function TurnoverReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const data = await getCapitalRotationAnalytics();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Turnover Report</h1>
      <Card>
        <CardHeader><CardTitle>Inventory Turnover by Category</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead className="text-right">Rotation</TableHead><TableHead className="text-right">Avg Sell Days</TableHead><TableHead className="text-right">Sold Items</TableHead></TableRow></TableHeader>
            <TableBody>
              {data.byCategory.map((row, idx) => (
                <TableRow key={`${row.category}-${idx}`}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell className="text-right">{row.rotationRate.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{row.avgSellDays.toFixed(1)}</TableCell>
                  <TableCell className="text-right">{row.soldItems}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
