"use client";

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { rememberMarketplaceSyncBatch } from "@/components/marketplace/sync-client";

export interface MarketplaceShopOption {
  id: string;
  marketplace: string;
  name: string;
}

export function MarketplaceSyncPanel({
  shops,
  syncType,
}: {
  shops: MarketplaceShopOption[];
  syncType: "LISTINGS" | "ORDERS";
}) {
  const [pending, setPending] = useState(false);

  const queueSync = async (shopIds: string[]) => {
    if (!shopIds.length || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/integrations/marketplace/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopIds, syncType }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Unable to queue marketplace sync");
      rememberMarketplaceSyncBatch(payload.batchId);
      void fetch("/api/integrations/marketplace/sync/process", { method: "POST" }).catch(() => null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to queue marketplace sync", { duration: Infinity });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="space-y-3 border-b pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Sync {syncType === "LISTINGS" ? "Listings" : "Orders"}</h2>
          <p className="text-xs text-muted-foreground">Jobs run by shop and retain page-level progress.</p>
        </div>
        <Button onClick={() => void queueSync(shops.map((shop) => shop.id))} disabled={pending || shops.length === 0}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync All {syncType === "LISTINGS" ? "Listings" : "Orders"}
        </Button>
      </div>
      {shops.length === 0 ? (
        <p className="text-sm text-muted-foreground">No connected marketplace shops. Connect a shop before syncing.</p>
      ) : (
        <div className="divide-y rounded-md border">
          {shops.map((shop) => (
            <div key={shop.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{shop.marketplace} · {shop.name}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => void queueSync([shop.id])} disabled={pending}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Sync this shop
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}