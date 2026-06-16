"use client";

import useSWR from "swr";
import { Globe, ExternalLink, AlertTriangle, Activity, TrendingDown, TrendingUp, DollarSign, ShieldAlert, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ListingsData {
  total: number;
  eBay?: number;
  Etsy?: number;
  Amazon?: number;
  Website?: number;
  WhatsApp?: number;
}

interface MarketplaceOverviewProps {
  listings: ListingsData;
}

interface SyncStatsData {
  totalListings: number;
  pendingConflicts: number;
  criticalConflicts: number;
  listingStatusBreakdown: Record<string, number>;
  recentActivity: Array<unknown>;
}

interface HealthData {
  priceAlertCount: number;
  lowMarginCount: number;
  revenueLeakage: number;
  opportunityCount: number;
  totalListings: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

const platformConfig: Record<string, { color: string; bg: string }> = {
  eBay: { color: "text-blue-500 dark:text-blue-400", bg: "bg-blue-500/10" },
  Etsy: { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
  Amazon: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  Website: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  WhatsApp: { color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10" },
};

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  ACTIVE: { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", label: "Active" },
  LISTED: { color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10", label: "Listed" },
  DRAFT: { color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", label: "Draft" },
  PAUSED: { color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-500/10", label: "Paused" },
  SOLD: { color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", label: "Sold" },
};

const platformLabel: Record<string, string> = {
  ebay: "eBay", etsy: "Etsy", amazon: "Amazon", website: "Website", whatsapp: "WhatsApp",
};

export function MarketplaceOverview({ listings }: MarketplaceOverviewProps) {
  const { data: syncData } = useSWR<SyncStatsData>("/api/marketplace/stats", fetcher, {
    refreshInterval: 30000,
  });

  const { data: healthData } = useSWR<HealthData>("/api/marketplace/health?usdRate=86", fetcher, {
    refreshInterval: 30000,
  });

  const platformOrder = ["eBay", "Etsy", "Amazon", "Website", "WhatsApp"];
  const listingMap = listings as unknown as Record<string, number | undefined>;
  const totalListings = listings.total ?? 0;
  const hasConflicts = syncData && ((syncData.pendingConflicts ?? 0) > 0 || (syncData.criticalConflicts ?? 0) > 0);
  const breakdown = syncData?.listingStatusBreakdown;
  const hasStatusData = breakdown && Object.keys(breakdown).length > 0;
  const statusOrder = ["ACTIVE", "LISTED", "DRAFT", "PAUSED", "SOLD"];

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full gem-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Globe className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Marketplace Overview</h2>
            <p className="text-xs text-muted-foreground">{totalListings} active listings</p>
          </div>
        </div>
        <Link
          href="/marketplace-control-center"
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
        >
          Manage <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {platformOrder.map((key) => {
          const count = listingMap[key] ?? 0;
          const cfg = platformConfig[key] ?? { color: "text-muted-foreground", bg: "bg-muted" };
          return (
            <Link
              key={key}
              href="/marketplace-control-center"
              className={cn(
                "flex flex-col items-center justify-center rounded-lg border border-border p-3 text-center transition-all duration-150",
                count > 0
                  ? "hover:border-primary/20 hover:bg-primary/5"
                  : "opacity-40"
              )}
            >
              <div className={cn("flex h-7 w-7 items-center justify-center rounded-md mb-1.5", cfg.bg)}>
                <Globe className={cn("h-3.5 w-3.5", cfg.color)} />
              </div>
              <span className="text-lg font-bold text-foreground leading-tight">{count}</span>
              <span className="text-[10px] text-muted-foreground leading-tight">{key}</span>
            </Link>
          );
        })}
      </div>

      {(hasStatusData || hasConflicts) && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Sync Status</span>
          </div>
          {hasStatusData && (
            <div className="flex flex-wrap gap-2">
              {statusOrder.map((status) => {
                const count = breakdown[status];
                if (!count || count === 0) return null;
                const cfg = statusConfig[status] ?? { color: "text-muted-foreground", bg: "bg-muted", label: status };
                return (
                  <div key={status} className={cn("flex items-center gap-1.5 rounded-full px-2.5 py-1", cfg.bg)}>
                    <Circle className={cn("h-2 w-2 fill-current", cfg.color)} />
                    <span className="text-xs font-medium text-foreground">{count}</span>
                    <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
          {hasConflicts && (
            <div className="mt-2 flex items-center justify-between rounded-md border border-border bg-amber-500/5 p-2">
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-foreground">
                  {syncData.criticalConflicts > 0
                    ? `${syncData.criticalConflicts} critical conflict${syncData.criticalConflicts > 1 ? "s" : ""}`
                    : `${syncData.pendingConflicts} pending conflict${syncData.pendingConflicts > 1 ? "s" : ""}`}
                </span>
              </div>
              <Link href="/marketplace-conflicts" className="text-[11px] text-primary hover:underline">
                View
              </Link>
            </div>
          )}
        </div>
      )}

      {healthData && healthData.totalListings > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Marketplace Health</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/marketplace-control-center?priceStatus=below_selling"
              className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2.5 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-100 dark:bg-red-900/50">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-700 dark:text-red-400">{healthData.priceAlertCount}</div>
                <div className="text-[10px] text-red-600 dark:text-red-500">Price Alerts</div>
              </div>
            </Link>

            <Link
              href="/marketplace-control-center?filter=lowMargin"
              className="flex items-center gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2.5 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-amber-100 dark:bg-amber-900/50">
                <TrendingDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-amber-700 dark:text-amber-400">{healthData.lowMarginCount}</div>
                <div className="text-[10px] text-amber-600 dark:text-amber-500">Low Margin</div>
              </div>
            </Link>

            <Link
              href="/marketplace-control-center?report=revenue_leakage"
              className="flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-2.5 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-red-100 dark:bg-red-900/50">
                <DollarSign className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-red-700 dark:text-red-400">{formatCurrency(healthData.revenueLeakage)}</div>
                <div className="text-[10px] text-red-600 dark:text-red-500">Revenue Leakage</div>
              </div>
            </Link>

            <Link
              href="/marketplace-control-center?report=opportunity"
              className="flex items-center gap-2 rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-emerald-100 dark:bg-emerald-900/50">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{healthData.opportunityCount}</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-500">Opportunities</div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}