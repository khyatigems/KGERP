import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getCustomerIntelligence } from "@/lib/customer-intelligence";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CustomerIntelligencePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) redirect("/reports");

  const data = await getCustomerIntelligence(365);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customer Intelligence</h1>
          <p className="text-sm text-muted-foreground">Repeat behavior, purchase timeline, and ticket-size analytics.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/reports">Back to Reports</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Unique Customers</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.summary.uniqueCustomers}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Repeat Customers</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.summary.repeatCustomers}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Repeat Rate</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.summary.repeatRate.toFixed(1)}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Avg Ticket</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(data.summary.avgTicketSize)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Transactions</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{data.summary.totalTransactions}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Revenue</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Customers</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead className="text-right">Purchases</TableHead><TableHead className="text-right">Avg Ticket</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.topCustomers.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="text-right">{row.totalPurchases}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.avgTicketSize)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Purchase Timeline</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.purchaseTimeline.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{new Date(row.saleDate).toLocaleDateString()}</TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.netAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
