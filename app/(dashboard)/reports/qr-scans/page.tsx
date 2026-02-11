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
import { QrCode, Link as LinkIcon, Eye, FileText, Package, User, Globe, Monitor } from "lucide-react";
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

  // Fetch entity names for better readability
  const skuIds = logs.filter(l => l.entityType === "SKU_VIEW" && l.entityId).map(l => l.entityId as string);
  const invoiceIds = logs.filter(l => l.entityType === "INVOICE_VIEW" && l.entityId).map(l => l.entityId as string);

  const [items, invoices] = await Promise.all([
    prisma.inventory.findMany({
      where: { id: { in: skuIds } },
      select: { id: true, itemName: true }
    }),
    prisma.invoice.findMany({
      where: { id: { in: invoiceIds } },
      select: { 
        id: true, 
        quotation: { select: { customer: { select: { name: true } } } } 
      }
    })
  ]);

  const entityNameMap = new Map<string, string>();
  items.forEach(item => entityNameMap.set(item.id, item.itemName));
  invoices.forEach(inv => {
    const name = inv.quotation?.customer?.name || "Unknown Customer";
    entityNameMap.set(inv.id, name);
  });

  // Calculate Stats
  const totalViews = logs.length;
  const qrScans = logs.filter(l => l.actionType === "QR_SCAN").length;
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
                <TableHead>Item / Customer</TableHead>
                <TableHead>ID</TableHead>
                <TableHead>User Type</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead className="text-right">Platform</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => {
                  const details = log.details ? JSON.parse(log.details) : {};
                  const entityName = log.entityId ? entityNameMap.get(log.entityId) : null;
                  const isStaff = details.isStaff || !!log.userId;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {format(new Date(log.createdAt), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        {log.actionType === "QR_SCAN" ? (
                          <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                            <QrCode className="w-3 h-3 mr-1" /> QR Scan
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <LinkIcon className="w-3 h-3 mr-1" /> Direct
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{entityName || "Unknown"}</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {log.entityType === "SKU_VIEW" ? "Inventory" : "Invoice"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px]">
                        {log.entityIdentifier}
                      </TableCell>
                      <TableCell>
                        {isStaff ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                            <User className="w-3 h-3 mr-1" /> Staff
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            Public
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[10px]">
                        {log.ipAddress || "Unknown"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Monitor className="w-3 h-3 mr-1" />
                            {details.os || parseOS(log.userAgent || "")}
                          </div>
                          <div className="flex items-center text-[10px] text-muted-foreground/70">
                            <Globe className="w-2.5 h-2.5 mr-1" />
                            {details.browser || parseBrowser(log.userAgent || "")}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function parseOS(ua: string): string {
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Macintosh")) return "macOS";
  if (ua.includes("Linux")) return "Linux";
  return "Unknown OS";
}

function parseBrowser(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("SamsungBrowser")) return "Samsung";
  if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";
  if (ua.includes("Edge")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown Browser";
}
