import { Metadata } from "next";
import { ensureActivityLogSchema, prisma, type ActivityLog } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Filter } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Activity Log | KhyatiGems™",
};

export default async function ActivityLogPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    await ensureActivityLogSchema();

    const session = await auth();
    if (!session?.user?.id) return null;

    const isSuperAdmin = (session.user.role || "") === "SUPER_ADMIN";
    if (!isSuperAdmin) {
      const canView = await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW);
      if (!canView) return null;
    }

    const params = await searchParams;
    const page = Number(params.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    // Filters
    const module = typeof params.module === "string" ? params.module : undefined;
    const actionType = typeof params.actionType === "string" ? params.actionType : undefined;
    const userId = typeof params.userId === "string" ? params.userId : undefined;
    const source = typeof params.source === "string" ? params.source : undefined;
    const q = typeof params.q === "string" ? params.q.trim() : "";
    const from = typeof params.from === "string" ? params.from : undefined;
    const to = typeof params.to === "string" ? params.to : undefined;
    
    const where: any = {};
    if (module && module !== "ALL") where.module = module;
    if (actionType && actionType !== "ALL") where.actionType = actionType;
    if (source && source !== "ALL") where.source = source;
    if (isSuperAdmin) {
      if (userId && userId !== "ALL") where.userId = userId;
    } else {
      where.userId = session.user.id;
    }
    if (q) {
      where.OR = [
        { referenceId: { contains: q, mode: "insensitive" } },
        { entityIdentifier: { contains: q, mode: "insensitive" } },
        { details: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { userName: { contains: q, mode: "insensitive" } },
        { module: { contains: q, mode: "insensitive" } },
        { actionType: { contains: q, mode: "insensitive" } },
      ];
    }
    if (from || to) {
      const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
      const lte = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
      where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }
    
    // Fetch logs
    let logs: any[] = [];
    let totalCount = 0;
    
    try {
        logs = await prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            skip,
        });
        totalCount = await prisma.activityLog.count({ where });
    } catch (error) {
        console.error("Failed to fetch activity logs:", error);
    }
    
    const totalPages = Math.ceil(totalCount / limit);

    const userOptions = isSuperAdmin
      ? await prisma.$queryRawUnsafe<Array<{ userId: string | null; userName: string | null }>>(
          `SELECT DISTINCT userId, userName FROM "ActivityLog" WHERE userId IS NOT NULL ORDER BY userName LIMIT 200`
        ).catch(() => [])
      : [];
    const moduleOptions = await prisma.$queryRawUnsafe<Array<{ module: string | null }>>(
      `SELECT DISTINCT module FROM "ActivityLog" WHERE module IS NOT NULL ORDER BY module LIMIT 200`
    ).catch(() => []);
    const sourceOptions = await prisma.$queryRawUnsafe<Array<{ source: string | null }>>(
      `SELECT DISTINCT source FROM "ActivityLog" WHERE source IS NOT NULL ORDER BY source LIMIT 50`
    ).catch(() => []);

    const exportRows = logs.map((logItem) => {
      const log = logItem as any;
      return {
        Time: String(log.createdAt),
        User: log.userName || log.userId || "System",
        Action: log.actionType || log.action || "UNKNOWN",
        Module: log.module || log.entityType || "",
        Reference: log.referenceId || log.entityIdentifier || log.entityId || "",
        Source: log.source || "",
        Description: log.description || log.details || "",
      };
    });
    const exportColumns = [
      { header: "Time", key: "Time" },
      { header: "User", key: "User" },
      { header: "Action", key: "Action" },
      { header: "Module", key: "Module" },
      { header: "Reference", key: "Reference" },
      { header: "Source", key: "Source" },
      { header: "Description", key: "Description" },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <form className="flex flex-wrap items-end gap-3" action="/activity-log" method="get">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Module</div>
                  <select name="module" defaultValue={module || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="ALL">All</option>
                    {moduleOptions.map((m) => (
                      <option key={String(m.module)} value={String(m.module)}>{String(m.module)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Action</div>
                  <select name="actionType" defaultValue={actionType || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="ALL">All</option>
                    {["CREATE","EDIT","UPDATE","DELETE","LOGIN","LOGOUT","PUBLIC_VIEW","QR_SCAN"].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {isSuperAdmin ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">User</div>
                    <select name="userId" defaultValue={userId || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
                      <option value="ALL">All</option>
                      {userOptions.map((u) => (
                        <option key={String(u.userId)} value={String(u.userId)}>
                          {String(u.userName || u.userId)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Source</div>
                  <select name="source" defaultValue={source || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
                    <option value="ALL">All</option>
                    {sourceOptions.map((s) => (
                      <option key={String(s.source)} value={String(s.source)}>{String(s.source)}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">From</div>
                  <input name="from" defaultValue={from || ""} type="date" className="h-9 rounded-md border bg-background px-3 text-sm" />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">To</div>
                  <input name="to" defaultValue={to || ""} type="date" className="h-9 rounded-md border bg-background px-3 text-sm" />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Search</div>
                  <input name="q" defaultValue={q} placeholder="Invoice #, SKU, user..." className="h-9 rounded-md border bg-background px-3 text-sm w-[240px]" />
                </div>

                <Button variant="outline" size="sm" className="h-9">
                  <Filter className="mr-2 h-4 w-4" />
                  Apply
                </Button>
              </form>

              <ExportButton filename="activity-log" data={exportRows} columns={exportColumns} title="Activity Log" label="Export CSV/Excel/PDF" />
            </div>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Action</TableHead>
                            <TableHead>Entity</TableHead>
                            <TableHead>Identifier</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Description</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {logs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No activity logs found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((logItem) => {
                                 const log = logItem as any;
                                 const metaStr = log.metadata || log.fieldChanges;
                                 return (
                                 <TableRow key={log.id}>
                                     <TableCell>
                                         <Badge variant={
                                             (log.action || log.actionType) === 'CREATE' ? 'default' : 
                                             (log.action || log.actionType) === 'EDIT' || (log.action || log.actionType) === 'UPDATE' ? 'secondary' : 
                                             (log.action || log.actionType) === 'DELETE' ? 'destructive' : 'outline'
                                         }>
                                             {log.action || log.actionType || "UNKNOWN"}
                                         </Badge>
                                     </TableCell>
                                     <TableCell>{log.module || log.entityType}</TableCell>
                                     <TableCell className="font-medium">
                                         {log.referenceId || log.entityIdentifier || log.entityId || "-"}
                                     </TableCell>
                                     <TableCell>
                                     {log.userName || log.userId || "System"}
                                         {log.source && log.source !== 'WEB' && (
                                             <span className="text-xs text-muted-foreground ml-1">({log.source})</span>
                                         )}
                                     </TableCell>
                                     <TableCell className="text-muted-foreground">
                                         {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                                     </TableCell>
                                     <TableCell>
                                         <div className="flex flex-col gap-1">
                                             <div className="text-xs" title={log.description || log.details || "No details"}>
                                                 {log.description || log.details || "-"}
                                             </div>
                                             {metaStr && (
                                                 <details className="text-[10px] text-muted-foreground cursor-pointer">
                                                     <summary>View Changes</summary>
                                                     <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto max-w-[400px]">
                                                         {metaStr}
                                                     </pre>
                                                 </details>
                                             )}
                                         </div>
                                     </TableCell>
                                 </TableRow>
                             )})
                        )}
                    </TableBody>
                </Table>
            </div>
            
            {/* Simple Pagination */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages || 1}
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} asChild>
                        <Link href={`/activity-log?page=${page - 1}`}>Previous</Link>
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} asChild>
                        <Link href={`/activity-log?page=${page + 1}`}>Next</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
