import type { Metadata } from "next";
import { listConnectors } from "@/lib/marketplace/connectors";
import { getEbayConfigurationError } from "@/lib/marketplace/connectors/ebay";
import { getFeatureFlags, type FeatureFlagKey } from "@/lib/marketplace/feature-flags";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { prisma } from "@/lib/prisma";
import { MarketplaceConnectionsClient } from "./marketplace-connections-client";
import { isEtsyProfileConfigured } from "@/lib/marketplace/connectors/etsy";
import Link from "next/link";
import { websiteEnabled } from "@/lib/website/store";

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
      const ebayConfigurationError = connector.platform === "EBAY" ? getEbayConfigurationError() : null;
      const missingConfiguration: string[] = connector.platform === "EBAY"
        ? ebayConfigurationError ? [ebayConfigurationError] : []
        : [
            !String(process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY || process.env.ETSY_KEYSTRING || "").trim() ? "ETSY_CLIENT_ID" : "",
            !String(process.env.ETSY_SHARED_SECRET || process.env.ETSY_API_SECRET || "").trim() ? "ETSY_SHARED_SECRET" : "",
            !String(process.env.ETSY_REDIRECT_URI || "").trim() ? "ETSY_REDIRECT_URI" : "",
          ].filter(Boolean);
      return {
        marketplace: connector.platform,
        configured: await connector.isConfigured(),
        missingConfiguration,
        appProfiles: connector.platform === "ETSY"
          ? {
              ETSY_SELLER_LEGACY: await isEtsyProfileConfigured("ETSY_SELLER_LEGACY"),
              ETSY_SECONDARY: await isEtsyProfileConfigured("ETSY_SECONDARY"),
            }
          : undefined,
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
      oauthAppProfile: true,
      lastConnectedAt: true,
      shops: {
        orderBy: { name: "asc" },
        select: { id: true, externalShopId: true, name: true, status: true },
      },
    },
  });

  return (
    <div className="space-y-6">
    {websiteEnabled() && <section className="rounded-lg border p-5"><h2 className="text-lg font-semibold">Website · KhyatiGems</h2><p className="mt-2 text-sm text-muted-foreground">Native website listing channel. Create listings through Marketplaces and manage their visibility and collections in Website Management. Storefront feed configuration is a separate deployment step.</p><div className="mt-3 flex gap-4 text-sm"><Link href="/marketplace-create-listings?marketplace=WEBSITE">Create website listing</Link><Link href="/marketplace-listings?marketplace=WEBSITE">Listed products</Link><Link href="/website-management">Website Management</Link></div></section>}
    <MarketplaceConnectionsClient
      flags={flags as Record<FeatureFlagKey, boolean>}
      platforms={platforms}
      connections={connections}
      oauthError={oauthResult.error || null}
      oauthConnected={oauthResult.connected || null}
      oauthShopCount={Number(oauthResult.shops) || 0}
    />
    </div>
  );
}
