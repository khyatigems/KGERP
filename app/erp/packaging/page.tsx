import Link from "next/link";
import { format } from "date-fns";
import { History, Printer, ScanLine, Settings, ShieldCheck, Package, RefreshCw, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { CreatePackagingWizard } from "./create/create-wizard";

export const dynamic = "force-dynamic";

type PrismaRecord = Record<string, unknown>;
type GpisSettingsRow = {
  updatedAt?: Date | string | null;
};
type GpisSettingsDelegate = {
  findFirst: (args?: PrismaRecord) => Promise<GpisSettingsRow | null>;
};
type GpisSerialDelegate = {
  count: (args?: PrismaRecord) => Promise<number>;
};
type PackagingCartItemDelegate = {
  count: (args?: PrismaRecord) => Promise<number>;
};
type GpisPrintJobRow = {
  id: string;
  printJobId: string;
  sku?: string | null;
  totalLabels?: number | null;
  printedAt: Date | string;
};
type GpisPrintJobDelegate = {
  findMany: (args?: PrismaRecord) => Promise<GpisPrintJobRow[]>;
};
type GpisVerificationLogRow = {
  id: string;
  serialNumber: string;
  ipAddress?: string | null;
  scannedAt: Date | string;
};
type GpisVerificationLogDelegate = {
  count: (args?: PrismaRecord) => Promise<number>;
  findMany: (args?: PrismaRecord) => Promise<GpisVerificationLogRow[]>;
};
type PackagingPrismaClient = typeof prisma & {
  gpisSettings: GpisSettingsDelegate;
  gpisSerial: GpisSerialDelegate;
  gpisPrintJob: GpisPrintJobDelegate;
  gpisVerificationLog: GpisVerificationLogDelegate;
  packagingCartItem: PackagingCartItemDelegate;
};

const packagingPrisma = prisma as unknown as PackagingPrismaClient;

export default async function PackagingDashboard() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    settings,
    totalSerials,
    activeSerials,
    reprintedSerials,
    cancelledSerials,
    cartCount,
    scansToday,
    recentJobs,
    recentScans,
  ] = await Promise.all([
    packagingPrisma.gpisSettings.findFirst(),
    packagingPrisma.gpisSerial.count(),
    packagingPrisma.gpisSerial.count({ where: { status: "ACTIVE" } }),
    packagingPrisma.gpisSerial.count({ where: { status: "REPRINTED" } }),
    packagingPrisma.gpisSerial.count({ where: { status: "CANCELLED" } }),
    packagingPrisma.packagingCartItem.count(),
    packagingPrisma.gpisVerificationLog.count({ where: { scannedAt: { gte: startOfDay } } }),
    packagingPrisma.gpisPrintJob.findMany({
      orderBy: { printedAt: "desc" },
      take: 5,
    }),
    packagingPrisma.gpisVerificationLog.findMany({
      orderBy: { scannedAt: "desc" },
      take: 10,
    }),
  ]);

  const settingsReady = Boolean(settings);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Packaging Identity</h1>
          <p className="text-muted-foreground">High-precision label workflow, serial control, and verification visibility.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/erp/packaging/ledger">
              <History className="mr-2 h-4 w-4" />
              Serial Ledger
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/erp/packaging/logs">
              <ShieldCheck className="mr-2 h-4 w-4" />
              Verification Logs
            </Link>
          </Button>
          <Button asChild>
            <Link href="/erp/packaging/settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Serials</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSerials}</div>
            <div className="text-xs text-muted-foreground">All generated serials</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Serials</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSerials}</div>
            <div className="text-xs text-muted-foreground">Eligible for verification</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reprints</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reprintedSerials}</div>
            <div className="text-xs text-muted-foreground">Reprinted serials</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cancelled</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cancelledSerials}</div>
            <div className="text-xs text-muted-foreground">Voided serials</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Print Cart</CardTitle>
            <Printer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cartCount}</div>
            <div className="text-xs text-muted-foreground">Ready to print</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scans Today</CardTitle>
            <ScanLine className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scansToday}</div>
            <div className="text-xs text-muted-foreground">Verification checks</div>
          </CardContent>
        </Card>
      </div>

      <Card className="w-full">
        <CardHeader className="space-y-2">
          <CardTitle>Create Packaging Labels</CardTitle>
          <div className="text-sm text-muted-foreground">
            Validate inventory, generate serials, and print precise mm-based labels with live preview.
          </div>
        </CardHeader>
        <CardContent>
          <CreatePackagingWizard />
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Module Status</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Configuration</span>
              <Badge variant={settingsReady ? "default" : "destructive"}>
                {settingsReady ? "Configured" : "Needs setup"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Last updated</span>
              <span className="font-medium text-foreground">
                {settings?.updatedAt ? format(new Date(settings.updatedAt), "MMM d, yyyy") : "Not configured"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Printer type</span>
              <span className="font-medium text-foreground">A4 / 100×50mm</span>
            </div>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/erp/packaging/settings">Review Settings</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Quick Actions</CardTitle>
            <div className="text-sm text-muted-foreground">Jump to the most used tools.</div>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/erp/packaging/ledger">
                <History className="mr-2 h-4 w-4" />
                Serial Ledger
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/erp/packaging/logs">
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verification Logs
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/erp/packaging/settings">
                <Settings className="mr-2 h-4 w-4" />
                Label Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Recent Print Jobs</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/erp/packaging/ledger">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No print jobs yet.
              </div>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{job.printJobId}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.sku || "Mixed SKU"} · {job.totalLabels ?? 0} labels
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(job.printedAt), "MMM d")}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle>Recent Scans</CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/erp/packaging/logs">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentScans.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                No scans recorded.
              </div>
            ) : (
              recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">{scan.serialNumber}</div>
                    <div className="text-xs text-muted-foreground">{scan.ipAddress || "Unknown IP"}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(scan.scannedAt), "MMM d")}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
