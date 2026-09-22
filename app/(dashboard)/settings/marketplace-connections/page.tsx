import type { Metadata } from "next";
import { listConnectors } from "@/lib/marketplace/connectors";
import { getConnectionStatus } from "@/lib/marketplace/oauth";
import { getFeatureFlags, type FeatureFlagKey } from "@/lib/marketplace/feature-flags";
import { MarketplaceConnectionsClient } from "./marketplace-connections-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace Connections",
  robots: { index: false, follow: false },
};

export default async function MarketplaceConnectionsPage() {
  const flags = await getFeatureFlags();
  const connectors = listConnectors();
  const connections = await Promise.all(
    connectors.map(async (c) => ({
      marketplace: c.platform,
      configured: await c.isConfigured(),
      status: await getConnectionStatus(c.platform),
    }))
  );

  return (
    <MarketplaceConnectionsClient
      flags={flags as Record<FeatureFlagKey, boolean>}
      connections={connections}
    />
  );
}
