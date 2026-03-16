import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { getSystemLogsReportData } from "@/lib/report-module-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SystemLogsReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) redirect("/");
  const data = await getSystemLogsReportData();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">System Logs</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader><CardTitle>Total Activity Logs</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data.activityCount}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Unpaid Invoices</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data.unpaidInvoices}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Freeze Block Events</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data.freezeBlocks}</div></CardContent></Card>
      </div>
    </div>
  );
}
