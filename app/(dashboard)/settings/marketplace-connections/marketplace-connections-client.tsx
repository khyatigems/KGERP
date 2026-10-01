"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FeatureFlagKey } from "@/lib/marketplace/feature-flags";
import { rememberMarketplaceSyncBatch } from "@/components/marketplace/sync-client";

interface Connection {
  id: string;
  marketplace: string;
  externalAccountId: string | null;
  name: string | null;
  status: string | null;
  oauthAppProfile?: string | null;
  lastConnectedAt: Date | string | null;
  shops: Array<{ id: string; externalShopId: string; name: string; status: string }>;
}

interface PlatformConfig {
  marketplace: string;
  configured: boolean;
  missingConfiguration: string[];
  appProfiles?: Partial<Record<"ETSY_SELLER_LEGACY" | "ETSY_SECONDARY", boolean>>;
}

export function MarketplaceConnectionsClient({
  flags,
  platforms,
  connections,
  oauthError,
  oauthConnected,
  oauthShopCount,
}: {
  flags: Record<FeatureFlagKey, boolean>;
  platforms: PlatformConfig[];
  connections: Connection[];
  oauthError: string | null;
  oauthConnected: string | null;
  oauthShopCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  useEffect(() => {
    if (oauthError) toast.error(`Marketplace connection failed: ${oauthError}`, { duration: Infinity });
    else if (oauthConnected) toast.success(`${oauthConnected} connected${oauthShopCount ? ` · ${oauthShopCount} shop${oauthShopCount === 1 ? "" : "s"} available` : ""}`, { duration: 8000 });
  }, [oauthError, oauthConnected, oauthShopCount]);

  const connect = async (marketplace: string, appProfile?: string) => {
    if (connectingPlatform || pending) return;
    setConnectingPlatform(marketplace);
    try {
      const res = await fetch("/api/integrations/marketplace/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketplace, appProfile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to start ${marketplace} OAuth (HTTP ${res.status})`);
      const authorizationUrl = new URL(String(data.authorizationUrl || ""));
      if (authorizationUrl.protocol !== "https:") throw new Error("Marketplace returned an invalid authorization URL.");
      window.location.assign(authorizationUrl.toString());
    } catch (error) {
      setConnectingPlatform(null);
      toast.error(error instanceof Error ? error.message : `Failed to start ${marketplace} OAuth`, { duration: Infinity });
    }
  };

  const disconnect = (connectionId: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations/marketplace/connections", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ connectionId }),
        });
        if (!res.ok) throw new Error("Failed to disconnect");
        toast.success("Disconnected");
        setTimeout(() => window.location.reload(), 500);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to disconnect");
      }
    });
  };

  const sync = (shopIds: string[], syncType: "LISTINGS" | "ORDERS") => {
    startTransition(async () => {
      toast.info(`Queueing ${syncType.toLowerCase()} sync for ${shopIds.length} shop${shopIds.length === 1 ? "" : "s"}`);
      try {
        const res = await fetch("/api/integrations/marketplace/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopIds, syncType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sync failed");
        rememberMarketplaceSyncBatch(data.batchId);
        void fetch("/api/integrations/marketplace/sync/process", { method: "POST" }).catch(() => null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sync failed", { duration: Infinity });
      }
    });
  };

  const connectAnother = (marketplace: string, appProfile?: string) => connect(marketplace, appProfile);

  const syncEnabled = flags.marketplaceApiSyncEnabled;

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Marketplace Connections</h1>
        <p className="text-sm text-muted-foreground">
          Connect eBay and Etsy via official OAuth, then sync listings and orders into the ERP.
        </p>
      </div>

      {!flags.marketplaceApiSyncEnabled && (
        <Card className="border-amber-500">
          <CardContent className="py-4 text-sm">
            Marketplace API sync is <strong>disabled</strong>. Enable the{" "}
            <code className="rounded bg-muted px-1">marketplaceApiSyncEnabled</code> setting (and the
            per-platform flags) to use sync.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {platforms.map((platform) => (
          <Card key={platform.marketplace}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{platform.marketplace}</CardTitle>
                  <CardDescription>{platform.configured ? "Application OAuth is ready" : "OAuth credentials are not configured"}</CardDescription>
                </div>
                <Button onClick={() => void connectAnother(platform.marketplace, platform.marketplace === "ETSY" ? "ETSY_SELLER_LEGACY" : undefined)} disabled={pending || Boolean(connectingPlatform) || !platform.configured}>
                  {connectingPlatform === platform.marketplace ? "Opening OAuth..." : "Connect another shop"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {!platform.configured && (
                <p className="text-xs text-amber-700">
                  {platform.missingConfiguration.join(" ") || "OAuth configuration is invalid."} Update the server environment and redeploy the app.
                </p>
              )}
              {platform.marketplace === "ETSY" && (
                <Button variant="outline" size="sm" onClick={() => void connectAnother("ETSY", "ETSY_SECONDARY")} disabled={pending || Boolean(connectingPlatform) || !platform.appProfiles?.ETSY_SECONDARY}>
                  Connect with secondary Etsy app
                </Button>
              )}
              {connections.filter((connection) => connection.marketplace === platform.marketplace).map((connection) => {
                const connected = connection.status === "CONNECTED";
                const platformEnabled = connection.marketplace === "EBAY" ? flags.ebaySyncEnabled : flags.etsySyncEnabled;
                return (
                  <div key={connection.id} className="border-t pt-3 first:border-0 first:pt-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{connection.name || connection.externalAccountId || "Marketplace account"}</div>
                        <div className="text-xs text-muted-foreground">{connection.externalAccountId || "Legacy connection; reconnect to register its shop"}</div>
                        {connection.marketplace === "ETSY" && connection.oauthAppProfile && <div className="text-xs text-muted-foreground">App profile: {connection.oauthAppProfile}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={connected ? "default" : "secondary"}>{connection.status || "Disconnected"}</Badge>
                        <Button variant="outline" size="sm" onClick={() => disconnect(connection.id)} disabled={pending || !connected}>Disconnect</Button>
                      </div>
                    </div>
                    {connection.shops.length ? (
                      <div className="mt-3 space-y-2">
                        {connection.shops.map((shop) => (
                          <div key={shop.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm">{shop.name}</div>
                              <div className="truncate text-xs text-muted-foreground">Shop ID: {shop.externalShopId}</div>
                            </div>
                            <Badge variant={shop.status === "CONNECTED" ? "outline" : "secondary"}>{shop.status}</Badge>
                          </div>
                        ))}
                      </div>
                    ) : connected ? (
                      <p className="mt-3 text-xs text-amber-700">Reconnect this legacy account to register its shop identity before syncing.</p>
                    ) : null}
                    {connection.shops.some((shop) => shop.status === "CONNECTED") && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => sync(connection.shops.filter((shop) => shop.status === "CONNECTED").map((shop) => shop.id), "LISTINGS")} disabled={pending || !syncEnabled || !platformEnabled}>Queue Listings Sync</Button>
                        <Button variant="outline" size="sm" onClick={() => sync(connection.shops.filter((shop) => shop.status === "CONNECTED").map((shop) => shop.id), "ORDERS")} disabled={pending || !syncEnabled || !platformEnabled}>Queue Orders Sync</Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {!connections.some((connection) => connection.marketplace === platform.marketplace) && (
                <p className="text-sm text-muted-foreground">No shops connected yet.</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
