"use client";

import useSWR from "swr";
import { Globe, ExternalLink, AlertTriangle, Activity, Clock, Circle } from "lucide-react";
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

interface RecentActivityItem {
  id: string;
  inventoryId: string;
  platform: string;
  status: string;
  listedPrice: number;
  currency: string;
  listingUrl: string | null;
  updatedAt: string;
  sku: string | null;
  itemName: string | null;
}

interface SyncStatsData {
  totalListings: number;
  pendingConflicts: number;
  criticalConflicts: number;
  listingStatusBreakdown: Record<string, number>;
  recentActivity: RecentActivityItem[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", INR: "₹", AUD: "A$" };
  const sym = symbols[currency] || "$";
  return `${sym}${price.toLocaleString()}`;
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

  const platformOrder = ["eBay", "Etsy", "Amazon", "Website", "WhatsApp"];
  const listingMap = listings as unknown as Record<string, number | undefined>;
  const totalListings = listings.total ?? 0;
  const hasConflicts = syncData && ((syncData.pendingConflicts ?? 0) > 0 || (syncData.criticalConflicts ?? 0) > 0);
  const breakdown = syncData?.listingStatusBreakdown;
  const activityList = syncData?.recentActivity ?? [];
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

      {activityList.length > 0 && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</span>
          </div>
          <div className="space-y-1.5">
            {activityList.map((item) => {
              const platKey = item.platform.toLowerCase();
              const platCfg = platformConfig[platKey === "ebay" ? "eBay" : platKey === "etsy" ? "Etsy" : platKey === "amazon" ? "Amazon" : platKey === "website" ? "Website" : platKey === "whatsapp" ? "WhatsApp" : "eBay"] ?? platformConfig.eBay;
              const label = platformLabel[platKey] || item.platform;
              return (
                <div
                  key={item.id}
                  onClick={() => window.location.href = `/inventory/${item.inventoryId}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded", platCfg.bg)}>
                    <Globe className={cn("h-3 w-3", platCfg.color)} />
                  </div>
                  <span className={cn("text-[11px] font-medium shrink-0", platCfg.color)}>{label}</span>
                  {item.sku && (
                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">{item.sku}</span>
                  )}
                  {item.itemName && (
                    <span className="text-xs text-foreground truncate min-w-0">{item.itemName}</span>
                  )}
                  <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{formatPrice(item.listedPrice, item.currency)}</span>
                  <span className="text-[11px] text-muted-foreground shrink-0 w-14 text-right">{timeAgo(item.updatedAt)}</span>
                  {item.listingUrl && (
                    <a
                      href={item.listingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                      title="Open live listing"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}