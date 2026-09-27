import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function MarketplaceSyncHistoryPage() {
  const permission = await checkPermission(PERMISSIONS.LISTINGS_VIEW);
  if (!permission.success) redirect("/");
  await ensureMarketplaceFoundationSchema();

  const [jobs, logs] = await Promise.all([
    prisma.marketplaceSyncJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { marketplaceShop: { select: { marketplace: true, name: true } } },
    }),
    prisma.marketplaceSyncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 200,
      include: { marketplaceShop: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Marketplace Sync History</h1>
        <p className="text-sm text-muted-foreground">Queued jobs, page progress, results, and technical errors.</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Sync jobs</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Created</TableHead><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Progress</TableHead><TableHead>Records</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.createdAt.toLocaleString()}</TableCell>
                  <TableCell>{job.marketplaceShop.marketplace}</TableCell>
                  <TableCell>{job.marketplaceShop.name}</TableCell>
                  <TableCell>{job.syncType}</TableCell>
                  <TableCell><Badge variant={job.status === "FAILED" || job.status === "PARTIAL" ? "destructive" : job.status === "SUCCESS" ? "default" : "secondary"}>{job.status}</Badge></TableCell>
                  <TableCell>{job.progressStep}{job.progressDetail ? ` · ${job.progressDetail}` : ""}</TableCell>
                  <TableCell>{job.recordsScanned} scanned · {job.recordsCreated} created · {job.recordsUpdated} updated · {job.recordsFailed} failed</TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-destructive">{job.errorDetails || "—"}</TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && <TableRow><TableCell colSpan={8} className="h-20 text-center text-muted-foreground">No sync jobs yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Page-level execution log</h2>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Started</TableHead><TableHead>Marketplace</TableHead><TableHead>Shop</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Scanned</TableHead><TableHead>Created</TableHead><TableHead>Updated</TableHead><TableHead>Skipped / failed</TableHead><TableHead>Error</TableHead></TableRow></TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.startedAt.toLocaleString()}</TableCell><TableCell>{log.marketplace}</TableCell><TableCell>{log.marketplaceShop?.name || "Legacy"}</TableCell><TableCell>{log.syncType}</TableCell><TableCell><Badge variant={log.status === "FAILED" || log.status === "PARTIAL" ? "destructive" : "secondary"}>{log.status}</Badge></TableCell><TableCell>{log.recordsScanned}</TableCell><TableCell>{log.recordsCreated}</TableCell><TableCell>{log.recordsUpdated}</TableCell><TableCell>{log.recordsSkipped} / {log.recordsFailed}</TableCell><TableCell className="max-w-[320px] whitespace-normal text-xs text-destructive">{log.errorDetails || "—"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && <TableRow><TableCell colSpan={10} className="h-20 text-center text-muted-foreground">No detailed sync runs yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}