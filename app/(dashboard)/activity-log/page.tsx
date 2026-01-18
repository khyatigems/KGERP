import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Filter } from "lucide-react";

export const metadata: Metadata = {
  title: "Activity Log | Khyati Gems",
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
    const userId = typeof params.userId === 'string' ? params.userId : undefined;

    const where: any = {};
    if (entityType && entityType !== "ALL") where.entityType = entityType;
    if (actionType && actionType !== "ALL") where.actionType = actionType;
    // userId filtering would need a dropdown of users, skipping for now or simple input
    
    // Safety check for undefined prisma.activityLog
    let logs: any[] = [];
    let totalCount = 0;
    
    try {
        if (prisma.activityLog) {
            logs = await prisma.activityLog.findMany({
                where,
                orderBy: { timestamp: "desc" },
                take: limit,
                skip,
            });
            totalCount = await prisma.activityLog.count({ where });
        } else {
            console.warn("Prisma activityLog model is not accessible.");
        }
    } catch (error) {
        console.error("Failed to fetch activity logs:", error);
    }
    
    const totalPages = Math.ceil(totalCount / limit);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Activity Log</h1>
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
                            <TableHead>Changes</TableHead>
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
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell>
                                        <Badge variant={
                                            log.actionType === 'CREATE' ? 'default' : 
                                            log.actionType === 'EDIT' ? 'secondary' : 
                                            log.actionType === 'DELETE' ? 'destructive' : 'outline'
                                        }>
                                            {log.actionType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{log.entityType}</TableCell>
                                    <TableCell className="font-medium">
                                        {/* Make clickable based on entity type? */}
                                        {log.entityIdentifier}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{log.userName}</span>
                                            <span className="text-xs text-muted-foreground">{log.source}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm">
                                                {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {log.timestamp.toLocaleString()}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                                        {log.fieldChanges ? (
                                            <span title={log.fieldChanges}>
                                                {Object.keys(JSON.parse(log.fieldChanges)).join(", ")}
                                            </span>
                                        ) : "-"}
                                    </TableCell>
                                </TableRow>
                            ))
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
