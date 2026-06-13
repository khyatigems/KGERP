"use client";

import useSWR from "swr";
import { RefreshCw, AlertTriangle, XCircle, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SyncPlatform {
  name: string;
  successful?: number;
  failed?: number;
  pending?: number;
  conflicts?: number;
}

interface SyncStats {
  pendingConflicts?: number;
  criticalConflicts?: number;
  platforms?: SyncPlatform[];
}

const platformColors: Record<string, { color: string; bg: string }> = {
  ebay: { color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
  etsy: { color: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500/10" },
  amazon: { color: "text-amber-500 dark:text-amber-400", bg: "bg-amber-500/10" },
  website: { color: "text-emerald-500 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  whatsapp: { color: "text-green-500 dark:text-green-400", bg: "bg-green-500/10" },
};

export function MarketplaceSyncHealth() {
  const { data: syncData } = useSWR<SyncStats>("/api/marketplace/stats", fetcher, {
    refreshInterval: 30000,
  });

  if (!syncData) return null;

  const pending = syncData.pendingConflicts ?? 0;
  const critical = syncData.criticalConflicts ?? 0;
  const platforms = (syncData.platforms ?? []).filter(
    (p) => (p.successful ?? 0) + (p.failed ?? 0) + (p.pending ?? 0) > 0
  );

  if (platforms.length === 0 && pending === 0 && critical === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 gem-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 dark:text-purple-400">
            <RefreshCw className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Marketplace Sync</h2>
            <p className="text-xs text-muted-foreground">
              {platforms.length} platform{platforms.length !== 1 ? "s" : ""} connected
            </p>
          </div>
        </div>
        <Link
          href="/marketplace-control-center"
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          View all
        </Link>
      </div>

      <div className="space-y-2">
        {platforms.map((platform) => {
          const total = (platform.successful ?? 0) + (platform.failed ?? 0) + (platform.pending ?? 0);
          const syncPercent = total > 0 ? Math.round(((platform.successful ?? 0) / total) * 100) : 0;
          const pColor = platformColors[platform.name.toLowerCase()] ?? { color: "text-muted-foreground", bg: "bg-muted" };
          const isWarning = syncPercent >= 70 && syncPercent < 90;
          const isCritical = syncPercent < 70;

          return (
            <div
              key={platform.name}
              className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted/50"
            >
              <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", pColor.bg)}>
                <RefreshCw className={cn("h-3.5 w-3.5", pColor.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{platform.name}</span>
                  <span className={cn(
                    "text-xs font-semibold",
                    isCritical ? "text-red-500 dark:text-red-400" : isWarning ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"
                  )}>
                    {syncPercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCritical ? "bg-red-500" : isWarning ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${syncPercent}%` }}
                  />
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500/50" /> {platform.successful ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-3 w-3 text-red-500/50" /> {platform.failed ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-blue-500/50" /> {platform.pending ?? 0}
                  </span>
                  {(platform.conflicts ?? 0) > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-500/50" /> {platform.conflicts}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {(pending > 0 || critical > 0) && (
        <div className="mt-3 flex items-center justify-between rounded-lg border border-border bg-muted/50 p-2.5">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-foreground">
              {critical > 0
                ? `${critical} critical conflict${critical > 1 ? "s" : ""}`
                : `${pending} pending conflict${pending > 1 ? "s" : ""}`}
            </span>
          </div>
          <Link href="/marketplace-conflicts" className="text-[11px] text-primary hover:underline">
            Resolve
          </Link>
        </div>
      )}
    </div>
  );
}
