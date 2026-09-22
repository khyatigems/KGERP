"use client";

import { useState, useTransition } from "react";
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

interface Connection {
  marketplace: string;
  configured: boolean;
  status: string | null;
}

export function MarketplaceConnectionsClient({
  flags,
  connections,
}: {
  flags: Record<FeatureFlagKey, boolean>;
  connections: Connection[];
}) {
  const [pending, startTransition] = useTransition();

  const connect = (marketplace: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations/marketplace/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketplace }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to start OAuth");
        window.location.href = data.authorizationUrl;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to start OAuth");
      }
    });
  };

  const disconnect = (marketplace: string) => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/integrations/marketplace/connections", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketplace }),
        });
        if (!res.ok) throw new Error("Failed to disconnect");
        toast.success("Disconnected");
        setTimeout(() => window.location.reload(), 500);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to disconnect");
      }
    });
  };

  const sync = (marketplace: string, syncType: "LISTINGS" | "ORDERS") => {
    startTransition(async () => {
      toast.info(`Syncing ${syncType.toLowerCase()} for ${marketplace}…`);
      try {
        const res = await fetch("/api/integrations/marketplace/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marketplace, syncType }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Sync failed");
        toast.success(
          `Sync complete — ${data.scanned} scanned, ${data.created} created, ${data.updated} updated, ${data.skipped} skipped, ${data.failed} failed`
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sync failed");
      }
    });
  };

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

      {connections.map((conn) => {
        const connected = conn.status === "CONNECTED";
        const platformEnabled = conn.marketplace === "EBAY" ? flags.ebaySyncEnabled : flags.etsySyncEnabled;
        return (
          <Card key={conn.marketplace}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">{conn.marketplace}</CardTitle>
                  <CardDescription>
                    {conn.configured ? "Client credentials configured" : "Missing client credentials"}
                  </CardDescription>
                </div>
                <Badge variant={connected ? "default" : "secondary"}>
                  {connected ? "Connected" : conn.status || "Disconnected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {connected ? (
                  <Button variant="outline" onClick={() => disconnect(conn.marketplace)} disabled={pending}>
                    Disconnect
                  </Button>
                ) : (
                  <Button onClick={() => connect(conn.marketplace)} disabled={pending || !conn.configured}>
                    Connect via OAuth
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => sync(conn.marketplace, "LISTINGS")}
                  disabled={pending || !syncEnabled || !platformEnabled}
                >
                  Sync Listings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => sync(conn.marketplace, "ORDERS")}
                  disabled={pending || !syncEnabled || !platformEnabled}
                >
                  Sync Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
