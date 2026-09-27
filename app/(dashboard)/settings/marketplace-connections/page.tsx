import type { Metadata } from "next";
import { listConnectors } from "@/lib/marketplace/connectors";
import { getFeatureFlags, type FeatureFlagKey } from "@/lib/marketplace/feature-flags";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { MarketplaceConnectionsClient } from "./marketplace-connections-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace Connections",
  robots: { index: false, follow: false },
};

export default async function MarketplaceConnectionsPage() {
  const flags = await getFeatureFlags();
  await ensureMarketplaceFoundationSchema();
  const connectors = listConnectors();
  const platforms = await Promise.all(
    connectors.map(async (c) => ({
      marketplace: c.platform,
      configured: await c.isConfigured(),
    }))
  );
  const connections = await prisma.marketplaceConnection.findMany({
    orderBy: [{ marketplace: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      marketplace: true,
      externalAccountId: true,
      name: true,
      status: true,
      lastConnectedAt: true,
      shops: {
        orderBy: { name: "asc" },
        select: { id: true, externalShopId: true, name: true, status: true },
      },
    },
  });

  return (
    <MarketplaceConnectionsClient
      flags={flags as Record<FeatureFlagKey, boolean>}
      platforms={platforms}
      connections={connections}
    />
  );
}
