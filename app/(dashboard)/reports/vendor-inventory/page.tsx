import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getVendorInventoryData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

export default async function VendorInventoryReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getVendorInventoryData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Vendor Inventory</h1>
      <Card>
        <CardHeader><CardTitle>Vendor Stock and Fill Rate</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead className="text-right">Items</TableHead><TableHead className="text-right">Cost Value</TableHead><TableHead className="text-right">Sell Value</TableHead><TableHead className="text-right">Fill Rate</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.vendor}>
                  <TableCell>{row.vendor}</TableCell>
                  <TableCell className="text-right">{row.items}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.costValue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(row.sellValue)}</TableCell>
                  <TableCell className="text-right">{row.fillRate.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
