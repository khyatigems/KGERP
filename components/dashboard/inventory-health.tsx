"use client";

import useSWR from "swr";
import { Package, ImageIcon, ShieldAlert, CheckCircle2, Clock, PlusCircle, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const fetcher = async (url: string) => {
  const r = await fetch(url, { credentials: "include", cache: "no-store" });
  if (!r.ok) throw new Error(`Request failed: ${r.status}`);
  return r.json();
};

interface InventoryStats {
  totalItems: number;
  overallTotalItems?: number;
  withImagesCount: number;
  withCertificateCount: number;
  missingCertificationCount?: number;
  missingImagesCount?: number;
  withHsnCount: number;
  aging: {
    fresh: number;
    slow: number;
    dead: number;
  };
}

export function InventoryHealth() {
  const { data: stats } = useSWR<InventoryStats>(
    "/api/inventory/stats?mode=quick",
    fetcher
  );

  const totalInventory = stats?.overallTotalItems ?? stats?.totalItems ?? 0;
  const withImages = stats?.withImagesCount ?? 0;
  const withCerts = stats?.withCertificateCount ?? 0;
  const withHsn = stats?.withHsnCount ?? 0;
  const agingDead = stats?.aging?.dead ?? 0;
  const agingFresh = stats?.aging?.fresh ?? 0;

  const missingImages = stats?.missingImagesCount ?? (totalInventory > 0 ? totalInventory - withImages : 0);
  const missingCerts = stats?.missingCertificationCount ?? (totalInventory > 0 ? totalInventory - withCerts : 0);
  const missingHsn = totalInventory > 0 ? totalInventory - withHsn : 0;

  const imageComplete = totalInventory > 0 ? Math.round((withImages / totalInventory) * 100) : 100;
  const certComplete = withImages > 0 ? Math.round(((withImages - missingCerts) / withImages) * 100) : 100;
  const hsnComplete = totalInventory > 0 ? Math.round((withHsn / totalInventory) * 100) : 100;

  const items = [
    {
      id: "missing-images",
      label: "Missing Images",
      icon: ImageIcon,
      color: "text-slate-500 dark:text-slate-400",
      bg: "bg-slate-500/10",
      bar: "bg-slate-400 dark:bg-slate-500",
      filter: "missingImages",
      count: missingImages,
      pct: imageComplete,
      positive: false,
    },
    {
      id: "missing-certification",
      label: "Missing Certification",
      icon: ShieldAlert,
      color: "text-slate-500 dark:text-slate-400",
      bg: "bg-slate-500/10",
      bar: "bg-slate-400 dark:bg-slate-500",
      filter: "missingCertification",
      count: missingCerts,
      pct: certComplete,
      positive: false,
    },
    {
      id: "missing-hsn",
      label: "Missing HSN Code",
      icon: FileText,
      color: "text-slate-500 dark:text-slate-400",
      bg: "bg-slate-500/10",
      bar: "bg-slate-400 dark:bg-slate-500",
      filter: "missingHsn",
      count: missingHsn,
      pct: hsnComplete,
      positive: false,
    },
    {
      id: "stagnant",
      label: "Stagnant Stock (90+ days)",
      icon: Clock,
      color: "text-slate-500 dark:text-slate-400",
      bg: "bg-slate-500/10",
      bar: "bg-slate-400 dark:bg-slate-500",
      filter: "stagnant",
      count: agingDead,
      pct: totalInventory > 0 ? Math.round(((totalInventory - agingDead) / totalInventory) * 100) : 100,
      positive: false,
    },
    {
      id: "new-arrivals",
      label: "New Arrivals (30 days)",
      icon: PlusCircle,
      color: "text-emerald-500 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
      bar: "bg-emerald-500 dark:bg-emerald-400",
      filter: "newArrivals",
      count: agingFresh,
      pct: totalInventory > 0 ? Math.round((agingFresh / totalInventory) * 100) : 0,
      positive: true,
    },
  ];

  if (!stats) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 h-full sass-enter gem-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400">
            <Package className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Inventory Health</h2>
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 h-full sass-enter gem-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-500 dark:text-slate-400">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Inventory Health</h2>
          <p className="text-xs text-muted-foreground">{totalInventory} products</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/inventory?filter=${item.filter}`}
            className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
          >
            <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", item.bg)}>
              <item.icon className={cn("h-3.5 w-3.5", item.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </span>
                <span className={cn(
                  "text-xs font-semibold",
                  item.positive ? "text-emerald-600 dark:text-emerald-400" : "text-slate-600 dark:text-slate-400"
                )}>
                  {item.count}
                </span>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.bar
                  )}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {items.every((i) => i.count === 0) && (
        <div className="flex items-center gap-3 rounded-lg p-3 mt-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">All complete</p>
            <p className="text-xs text-muted-foreground">No inventory issues</p>
          </div>
        </div>
      )}

      <Link
        href="/inventory"
        className="mt-3 flex items-center justify-center rounded-lg border border-dashed border-border p-2 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
      >
        View full inventory
      </Link>
    </div>
  );
}
