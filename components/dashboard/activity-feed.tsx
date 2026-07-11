"use client";

import useSWR from "swr";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ActivityLog {
  id: string;
  entityType: string;
  actionType: string;
  entityIdentifier: string;
  timestamp: string;
  userName: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load activity feed");
  const data = await res.json().catch(() => []);
  return data;
};

const actionColors: Record<string, string> = {
  CREATE: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  UPDATE: "bg-blue-500/10 text-blue-500 dark:text-blue-400",
  EDIT: "bg-blue-500/10 text-blue-500 dark:text-blue-400",
  DELETE: "bg-red-500/10 text-red-500 dark:text-red-400",
  SYNC: "bg-purple-500/10 text-purple-500 dark:text-purple-400",
  PRINT: "bg-amber-500/10 text-amber-500 dark:text-amber-400",
};

const actionBg: Record<string, string> = {
  CREATE: "bg-emerald-500",
  UPDATE: "bg-blue-500",
  EDIT: "bg-blue-500",
  DELETE: "bg-red-500",
  SYNC: "bg-purple-500",
  PRINT: "bg-amber-500",
};

interface ActivityStats {
  total: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

export function ActivityFeed() {
  const { data: rawActivities, error, isLoading } = useSWR<ActivityLog[]>("/api/dashboard/activity", fetcher);
  const activities = Array.isArray(rawActivities) ? rawActivities.slice(0, 10) : [];
  const { data: stats } = useSWR<ActivityStats>("/api/dashboard/activity?stats=true", (url: string) => fetch(url).then(r => r.json()), {
    revalidateOnFocus: false,
  });

  const sortedActions = stats
    ? Object.entries(stats.byAction).sort((a, b) => b[1] - a[1])
    : [];
  const totalStats = stats?.total ?? 0;

  if (error) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full flex flex-col sass-enter gem-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent Activity</h2>
            <p className="text-xs text-muted-foreground">Latest events</p>
          </div>
        </div>
        <Link
          href="/activity-log"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          View All <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto space-y-0.5 min-h-0 max-h-[260px]">
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin h-4 w-4 text-muted-foreground" /></div>
        ) : Array.isArray(activities) && activities.length > 0 ? (
          activities.map((activity) => {
            const actionColor = actionColors[activity.actionType?.toUpperCase()] || "bg-muted text-muted-foreground";
            return (
              <div
                key={activity.id}
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/50"
              >
                <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${actionColor}`}>
                  <Activity className="h-2.5 w-2.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-flex items-center rounded px-1 py-0.5 text-[9px] font-medium uppercase ${actionColor}`}>
                      {activity.actionType?.replaceAll("_", " ") || "UNKNOWN"}
                    </span>
                    <span className="text-xs font-medium text-foreground truncate">
                      {activity.entityType}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {activity.entityIdentifier}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {(activity.userName && activity.userName !== "Unknown" ? activity.userName : "System")} &middot; {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No recent activity
          </div>
        )}
      </div>

      {sortedActions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Activity Breakdown</span>
            <span className="text-xs text-muted-foreground">{totalStats} events &middot; 30d</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {sortedActions.map(([action, count]) => {
              const barColor = actionBg[action] || "bg-muted-foreground";
              const widthPct = totalStats > 0 ? Math.round((count / totalStats) * 100) : 0;
              return (
                <div key={action} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                  <div className={cn("h-2 w-2 rounded-full shrink-0", barColor)} />
                  <span className="text-xs text-muted-foreground">{action}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">{count}</span>
                  <span className="text-[10px] text-muted-foreground/60 w-8 text-right">{widthPct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
