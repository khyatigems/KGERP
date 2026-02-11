import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { QrCode, Link as LinkIcon, Eye, FileText, Package } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function QrScansReportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    redirect("/");
  }

  // Fetch logs (limit to last 500 for performance)
  const logs = await prisma.activityLog.findMany({
    where: {
      entityType: { in: ["SKU_VIEW", "INVOICE_VIEW"] }
    },
    orderBy: { createdAt: "desc" },
    take: 500
  });

  // Calculate Stats
  const totalViews = logs.length;
  const qrScans = logs.filter(l => l.actionType === "QR_SCAN").length;
  const directLinks = logs.filter(l => l.actionType === "PUBLIC_VIEW").length;
  const skuViews = logs.filter(l => l.entityType === "SKU_VIEW").length;
  const invoiceViews = logs.filter(l => l.entityType === "INVOICE_VIEW").length;

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">QR Code & Link Analytics</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-muted-foreground">All time tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qrScans}</div>
            <p className="text-xs text-muted-foreground">Via Physical/Digital QR</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SKU Views</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skuViews}</div>
            <p className="text-xs text-muted-foreground">Inventory Page Visits</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Views</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoiceViews}</div>
            <p className="text-xs text-muted-foreground">Invoice Page Visits</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Identifier</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Device</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell>
                      {log.actionType === "QR_SCAN" ? (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                          <QrCode className="w-3 h-3 mr-1" /> QR Scan
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <LinkIcon className="w-3 h-3 mr-1" /> Direct Link
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.entityType === "SKU_VIEW" ? "Inventory Item" : "Invoice"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.entityIdentifier || log.entityId}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {log.ipAddress || "Unknown"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs max-w-[200px] truncate" title={log.userAgent || ""}>
                      {parseUserAgent(log.userAgent || "")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function parseUserAgent(ua: string): string {
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Macintosh")) return "Mac";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown Device";
}
