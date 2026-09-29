import type { Metadata } from "next";
import { listConnectors } from "@/lib/marketplace/connectors";
import { getEbayConfigurationError } from "@/lib/marketplace/connectors/ebay";
import { getFeatureFlags, type FeatureFlagKey } from "@/lib/marketplace/feature-flags";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { MarketplaceConnectionsClient } from "./marketplace-connections-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketplace Connections",
  robots: { index: false, follow: false },
};

export default async function MarketplaceConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string; shops?: string }>;
}) {
  const flags = await getFeatureFlags();
  await ensureMarketplaceFoundationSchema();
  const oauthResult = await searchParams;
  const connectors = listConnectors();
  const platforms = await Promise.all(
    connectors.map(async (connector) => {
      const missingConfiguration = connector.platform === "EBAY"
        ? getEbayConfigurationError() ? [getEbayConfigurationError()] : []
        : [
            !String(process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY || process.env.ETSY_KEYSTRING || "").trim() ? "ETSY_CLIENT_ID" : "",
            !String(process.env.ETSY_SHARED_SECRET || process.env.ETSY_API_SECRET || "").trim() ? "ETSY_SHARED_SECRET" : "",
            !String(process.env.ETSY_REDIRECT_URI || "").trim() ? "ETSY_REDIRECT_URI" : "",
          ].filter(Boolean);
      return {
        marketplace: connector.platform,
        configured: await connector.isConfigured(),
        missingConfiguration,
      };
    })
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
      oauthError={oauthResult.error || null}
      oauthConnected={oauthResult.connected || null}
      oauthShopCount={Number(oauthResult.shops) || 0}
    />
  );
}
