import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getLabelPrintingReportData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function LabelPrintingReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const rows = await getLabelPrintingReportData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Label Printing</h1>
      <Card><CardHeader><CardTitle>Print Queue and Reprint History</CardTitle></CardHeader><CardContent>
        <Table>
          <TableHeader><TableRow><TableHead>Job</TableHead><TableHead>User</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Labels</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.id.slice(0, 8)}</TableCell>
                <TableCell>{row.user.name || "-"}</TableCell>
                <TableCell><Badge variant="outline">{row.status}</Badge></TableCell>
                <TableCell className="text-right">{row.totalItems}</TableCell>
                <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
