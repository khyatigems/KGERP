import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getVendorDependencyData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export default async function VendorDependencyReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getVendorDependencyData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendor Dependency</h1>
      <Card>
        <CardHeader><CardTitle>Dependency Risk Matrix</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">On Hand</TableHead><TableHead className="text-right">Stock Value</TableHead><TableHead className="text-right">Dependency</TableHead><TableHead>Risk</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.vendor}>
                  <TableCell>{row.vendor}</TableCell>
                  <TableCell className="text-right">{row.onHandItems}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.stockValue)}</TableCell>
                  <TableCell className="text-right">{row.dependencyShare.toFixed(1)}%</TableCell>
                  <TableCell><Badge variant="outline">{row.riskLevel}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
