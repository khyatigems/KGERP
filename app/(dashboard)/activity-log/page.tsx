import { resolveMarketplaceActivities } from "@/lib/marketplace/activity-resolver";
import type { ActivityLog, Prisma } from "@prisma/client";
import { Metadata } from "next";
import { ensureActivityLogSchema, prisma } from "@/lib/prisma";
import { format, formatDistanceToNow } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Filter } from "lucide-react";
import { ExportButton } from "@/components/ui/export-button";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { AnimatedPage } from "@/components/ui/animated-page";
import { WorkspaceHeader } from "@/components/layout/workspace-header";
import { presentActivity, securityActions, securityRequestDetails } from "@/lib/security/activity";

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
      const canView = await checkUserPermission(session.user.id, PERMISSIONS.ACTIVITY_VIEW) || await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW);
      if (!canView) return null;
    }

    const params = await searchParams;
    const page = Number(params.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    // Filters
    const moduleFilter = typeof params.module === "string" ? params.module : undefined;
    const actionType = typeof params.actionType === "string" ? params.actionType : undefined;
    const userId = typeof params.userId === "string" ? params.userId : undefined;
    const source = typeof params.source === "string" ? params.source : undefined;
    const q = typeof params.q === "string" ? params.q.trim() : "";
    const from = typeof params.from === "string" ? params.from : undefined;
    const to = typeof params.to === "string" ? params.to : undefined;
    
    const where: Prisma.ActivityLogWhereInput = {};
    if (moduleFilter && moduleFilter !== "ALL") where.module = moduleFilter;
    if (actionType && actionType !== "ALL") where.actionType = actionType;
    if (source && source !== "ALL") where.source = source;
    if (isSuperAdmin) {
      if (userId && userId !== "ALL") where.userId = userId;
    } else {
      where.userId = session.user.id;
    }
    if (q) {
      const matchingAccounts = await prisma.user.findMany({ where: { OR: [{ email: { contains: q } }, { name: { contains: q } }] }, select: { id: true } });
      where.OR = [
        { referenceId: { contains: q } },
        { entityIdentifier: { contains: q } },
        { details: { contains: q } },
        { description: { contains: q } },
        { userName: { contains: q } },
        { userEmail: { contains: q } },
        { AND: [{ OR: [{ module: "Security" }, { entityType: "Security" }] }, { userId: { in: matchingAccounts.map(account => account.id) } }] },
        { module: { contains: q } },
        { actionType: { contains: q } },
      ];
    }
    if (from || to) {
      const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
      const lte = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
      where.createdAt = { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) };
    }
    
    // Fetch logs
    let logs: ActivityLog[] = [];
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

    let userOptionsRaw: Array<{ userId: string | null; userName: string | null }> = [];
    if (isSuperAdmin) {
      userOptionsRaw = await prisma.$queryRawUnsafe<Array<{ userId: string | null; userName: string | null }>>(
        `SELECT DISTINCT userId, userName FROM "ActivityLog" WHERE userId IS NOT NULL ORDER BY userName LIMIT 200`
      ).catch(() => []);
    }

    // Deduplicate by userId (keep first seen userName) to avoid duplicate option keys
    const userOptionsMap: Record<string, { userId: string; userName: string | null }> = {};
    userOptionsRaw.forEach(u => {
      if (!u || !u.userId) return;
      if (!userOptionsMap[u.userId]) userOptionsMap[u.userId] = { userId: u.userId, userName: u.userName };
    });
    const userOptions = Object.values(userOptionsMap);
    // Resolve historical security records in one batch without rewriting audit history.
    const accountIds = [...new Set([...logs.filter(log => (log.module || log.entityType) === "Security").map(log => log.userId || log.entityId), ...userOptions.map(option => option.userId)].filter((id): id is string => Boolean(id)))];
    const accounts = accountIds.length ? await prisma.user.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true, email: true } }) : [];
    const accountsById = new Map(accounts.map(account => [account.id, account]));
    const moduleOptions = await prisma.$queryRawUnsafe<Array<{ module: string | null }>>(
      `SELECT DISTINCT module FROM "ActivityLog" WHERE module IS NOT NULL ORDER BY module LIMIT 200`
    ).catch(() => []);
    const sourceOptions = await prisma.$queryRawUnsafe<Array<{ source: string | null }>>(
      `SELECT DISTINCT source FROM "ActivityLog" WHERE source IS NOT NULL ORDER BY source LIMIT 50`
    ).catch(() => []);

    const marketplaceDisplays = await resolveMarketplaceActivities(logs);
    const displayActivity = (log: ActivityLog) => ({ ...presentActivity(log, accountsById.get(log.userId || log.entityId || "")), ...marketplaceDisplays.get(log.id) });

    const exportRows = logs.map((logItem) => {
      const log = logItem;
      const display = displayActivity(log);
      const dt = log?.createdAt ? new Date(log.createdAt) : null;
      return {
        Time: dt && !Number.isNaN(dt.getTime()) ? format(dt, "dd-MMM-yyyy HH:mm") : String(log.createdAt || ""),
        User: display.user,
        Action: display.label,
        EventCode: display.action,
        Module: log.module || log.entityType || "",
        Reference: display.reference,
        EntityId: log.entityId || "",
        Source: log.source || "",
        Description: display.description,
      };
    });
    const exportColumns = [
      { header: "Time", key: "Time" },
      { header: "User", key: "User" },
      { header: "Action", key: "Action" },
      { header: "Event code", key: "EventCode" },
      { header: "Module", key: "Module" },
      { header: "Reference", key: "Reference" },
      { header: "Internal entity ID", key: "EntityId" },
      { header: "Source", key: "Source" },
      { header: "Description", key: "Description" },
    ];

    return (
        <AnimatedPage>
        <div className="space-y-6">
            <WorkspaceHeader eyebrow="KhyatiGems · Administration"><h1>Activity Log</h1><p>Review changes, sign-ins, and recorded activity across your ERP.</p></WorkspaceHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <form className="flex flex-wrap items-end gap-3" action="/activity-log" method="get">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-muted-foreground">Module</div>
                  <select name="module" defaultValue={moduleFilter || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
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
                    {[...new Set(["CREATE","EDIT","UPDATE","DELETE","LOGIN","LOGOUT","PUBLIC_VIEW","QR_SCAN","SYNC_QUEUED","SYNC_RETRY_QUEUED", ...Object.keys(securityActions)])].map((a) => (
                      <option key={a} value={a}>{securityActions[a]?.label || ({ SYNC_QUEUED: "Sync queued", SYNC_RETRY_QUEUED: "Sync retry queued" } as Record<string, string>)[a] || a}</option>
                    ))}
                  </select>
                </div>

                {isSuperAdmin ? (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">User</div>
                    <select name="userId" defaultValue={userId || "ALL"} className="h-9 rounded-md border bg-background px-3 text-sm">
                      <option value="ALL">All</option>
                      {userOptions.map((u) => (
                        <option key={`${u.userId}-${u.userName || ""}`} value={String(u.userId)}>
                          {accountsById.get(u.userId)?.name || String((u.userName && !["Unknown", "Sign-in security"].includes(u.userName) ? u.userName : "Unavailable account") || "System")}
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
                  <input name="q" defaultValue={q} placeholder="Invoice #, SKU, user..." className="h-9 rounded-md border bg-background px-3 text-sm w-60" />
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
                                 const log = logItem;
                                 const display = displayActivity(log);
                                 const metaStr = log.metadata || log.fieldChanges;
                                 const requestDetails = display.security ? securityRequestDetails(metaStr) : display.eventDetails || [];
                                 return (
                                 <TableRow key={log.id}>
                                     <TableCell>
                                         <Badge title={display.action} variant={
                                             (log.action || log.actionType) === 'CREATE' ? 'default' : 
                                             (log.action || log.actionType) === 'EDIT' || (log.action || log.actionType) === 'UPDATE' ? 'secondary' : 
                                             (log.action || log.actionType) === 'DELETE' ? 'destructive' : 'outline'
                                         }>
                                             {display.label}
                                         </Badge>
                                     </TableCell>
                                     <TableCell>{log.module || log.entityType}</TableCell>
                                     <TableCell className="font-medium" title={log.entityId || undefined}>
                                         {display.reference}
                                     </TableCell>
                                     <TableCell>
                                      {display.user}
                                         {log.source && log.source !== 'WEB' && (
                                             <span className="text-xs text-muted-foreground ml-1">({log.source})</span>
                                         )}
                                     </TableCell>
                                     <TableCell className="text-muted-foreground">
                                         {formatDistanceToNow(log.createdAt, { addSuffix: true })}
                                     </TableCell>
                                     <TableCell>
                                         <div className="flex flex-col gap-1">
                                             <div className="text-xs" title={display.description}>
                                                 {display.description}
                                             </div>
                                             {metaStr && (
                                                 <details className="text-[10px] text-muted-foreground cursor-pointer">
                                                     <summary>{display.security || display.eventDetails ? "Event details" : "View Changes"}</summary>
                                                     {display.security || display.eventDetails ? <div className="mt-1 space-y-1 rounded bg-muted p-2 text-xs">
                                                       {requestDetails.map((detail, index) => <p key={index}>{detail}</p>)}
                                                       <p>Event code: {display.action}</p>{display.security && <p>Internal account ID: {log.entityId || log.userId || "Unavailable"}</p>}
                                                       {!requestDetails.length && metaStr && <pre className="overflow-x-auto max-w-100">{metaStr}</pre>}
                                                     </div> : <pre className="mt-1 p-2 bg-muted rounded overflow-x-auto max-w-100">
                                                         {metaStr}
                                                     </pre>}
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
        </AnimatedPage>
    );
}
