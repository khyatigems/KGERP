"use client";

import useSWR from "swr";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { AlertCircle, CheckCircle2, Circle, ExternalLink, Mail, RefreshCw, Store } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShopStatus {
  id: string;
  marketplace: string;
  name: string;
  connected: boolean;
  lastSyncStatus: string | null;
  lastSyncAt: string | null;
}

interface IntegrationStatus {
  shops: ShopStatus[];
  zoho: {
    configured: boolean;
    connected: boolean;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
  };
}

const fetcher = async (url: string): Promise<IntegrationStatus> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to fetch integration status");
  return response.json();
};

function formatSyncTime(value: string | null) {
  if (!value) return "Never synced";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Sync time unavailable" : formatDistanceToNow(date, { addSuffix: true });
}

function SyncStatus({ status, syncedAt }: { status: string | null; syncedAt: string | null }) {
  const normalized = status?.toUpperCase();
  const failed = normalized === "FAILED" || normalized === "PARTIAL";
  const running = normalized === "RUNNING" || normalized === "PROCESSING" || normalized === "QUEUED";
  const label = normalized ? normalized.toLowerCase().replaceAll("_", " ") : "no sync yet";
  const Icon = failed ? AlertCircle : running ? RefreshCw : status ? CheckCircle2 : Circle;

  return (
    <span className="flex flex-col items-end gap-0.5">
      <span className={cn("inline-flex items-center gap-1 text-[10px] capitalize", failed ? "text-destructive" : running ? "text-amber-500" : status ? "text-emerald-500" : "text-muted-foreground")}>
        <Icon className={cn("h-3 w-3", running && "animate-spin motion-reduce:animate-none")} />
        {label}
      </span>
      <span className="text-[10px] text-muted-foreground">
        {syncedAt ? `Last sync ${formatSyncTime(syncedAt)}` : "Never synced"}
      </span>
    </span>
  );
}

export function ConnectionsStatusWidget() {
  const { data, error, isLoading } = useSWR<IntegrationStatus>("/api/dashboard/integration-status", fetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });
  const connectedShopCount = data?.shops.filter((shop) => shop.connected).length ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {isLoading && !data ? "Checking connections..." : `${connectedShopCount} marketplace shop${connectedShopCount === 1 ? "" : "s"} connected`}
        </p>
        <Link href="/settings/marketplace-connections" className="text-[11px] font-medium text-primary hover:underline">
          Manage
        </Link>
      </div>

      {error ? (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> Connection status could not be loaded.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {(data?.shops ?? []).slice(0, 4).map((shop) => (
              <div key={shop.id} className="flex items-center gap-2.5 rounded-lg border border-border/60 px-2.5 py-2">
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", shop.connected ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground")}>
                  <Store className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{shop.name}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{shop.marketplace}</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className={cn("text-[10px] font-medium", shop.connected ? "text-emerald-500" : "text-muted-foreground")}>
                    {shop.connected ? "Connected" : "Disconnected"}
                  </p>
                  <SyncStatus status={shop.lastSyncStatus} syncedAt={shop.lastSyncAt} />
                </div>
              </div>
            ))}
            {data?.shops.length === 0 && (
              <Link
                href="/settings/marketplace-connections"
                className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <Store className="h-4 w-4" /> Connect a marketplace shop
                <ExternalLink className="ml-auto h-3.5 w-3.5" />
              </Link>
            )}
            {(data?.shops.length ?? 0) > 4 && (
              <p className="text-right text-[10px] text-muted-foreground">+{(data?.shops.length ?? 0) - 4} more shops</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 border-t border-border/60 pt-3">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", data?.zoho.connected ? "bg-blue-500/10 text-blue-500" : "bg-muted text-muted-foreground")}>
              <Mail className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Zoho Mail</p>
              {data?.zoho.connected
                ? <SyncStatus status={data.zoho.lastSyncStatus} syncedAt={data.zoho.lastSyncAt} />
                : <p className="text-[10px] text-muted-foreground">{data?.zoho.configured ? "Account not connected" : "Not configured"}</p>}
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", data?.zoho.connected ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground")}>
              {data?.zoho.connected ? "Connected" : data?.zoho.configured ? "Not connected" : "Not configured"}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
