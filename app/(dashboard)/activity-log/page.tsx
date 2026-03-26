import { Metadata } from "next";
import { prisma, type ActivityLog } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Filter } from "lucide-react";

export const metadata: Metadata = {
  title: "Activity Log | KhyatiGems™",
};

export default async function ActivityLogPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams;
    const page = Number(params.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    
    // Filters
    const entityType = typeof params.entityType === 'string' ? params.entityType : undefined;
    const actionType = typeof params.actionType === 'string' ? params.actionType : undefined;
    
    const where: { entityType?: string; actionType?: string; userId?: string } = {};
    if (entityType && entityType !== "ALL") where.entityType = entityType;
    if (actionType && actionType !== "ALL") where.actionType = actionType;
    
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <div className="flex gap-2">
                    {/* Placeholder for more advanced filters */}
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                </div>
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
                            logs.map((log: {
                                id: string;
                                actionType: string | null;
                                entityType: string | null;
                                entityIdentifier: string | null;
                                entityId: string | null;
                                userName: string | null;
                                userId: string | null;
                                source: string | null;
                                createdAt: Date;
                                fieldChanges: string | null;
                                module: string | null;
                                action: string | null;
                                 referenceId: string | null;
                                 description: string | null;
                                 metadata: string | null;
                                 details?: string | null;
                             }) => {
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
                                         {log.userName || "System"}
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
