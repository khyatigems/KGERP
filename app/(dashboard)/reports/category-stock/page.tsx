import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCategoryStockData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function CategoryStockReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getCategoryStockData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Category Stock</h1>
      <Card>
        <CardHeader><CardTitle>Category Heat and ABC Classification</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Stock Value</TableHead><TableHead className="text-right">Contribution</TableHead><TableHead className="text-right">Reorder Alert</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={`${row.category}-${idx}`}>
                  <TableCell>{row.category}</TableCell>
                  <TableCell><Badge variant="outline">{row.abcClass}</Badge></TableCell>
                  <TableCell className="text-right">{row.items}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.stockValue)}</TableCell>
                  <TableCell className="text-right">{row.contributionPct.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{row.reorderAlert ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
