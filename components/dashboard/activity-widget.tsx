import { prisma } from "@/lib/prisma";
import { formatDistanceToNow } from "date-fns";
import { Activity } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export async function ActivityWidget() {
  let recentLogs: { id: string; entityType: string; actionType: string; entityIdentifier: string; userName: string | null; timestamp: Date }[] = [];
  let loggingDisabled = false;

  try {
    // Safety check for Prisma model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(prisma as any).activityLog) {
      console.warn("ActivityLog model not found in Prisma client");
      loggingDisabled = true;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentLogs = await (prisma as any).activityLog.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
      });
    }
  } catch (error: unknown) {
    console.error("Failed to fetch activity logs:", error);
    // Return empty state on error (e.g., table missing)
    recentLogs = [];
  }

  if (loggingDisabled) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-1 h-full">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>Activity logging is disabled.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-1 h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
            <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
            <Link href="/activity-log">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity.
            </p>
          ) : (
            recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
              >
                <div className={`mt-1 rounded-full p-1.5 ${
                    log.actionType === 'CREATE' ? 'bg-green-100 text-green-700' :
                    log.actionType === 'EDIT' ? 'bg-blue-100 text-blue-700' :
                    log.actionType === 'DELETE' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                    <Activity className="h-3 w-3" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {log.entityType} {log.actionType.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{log.entityIdentifier}</span> by {log.userName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
