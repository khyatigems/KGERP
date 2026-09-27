import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, type Permission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getConnector, listConnectors } from "@/lib/marketplace/connectors";
import { getFeatureFlags } from "@/lib/marketplace/feature-flags";
import { disconnect } from "@/lib/marketplace/oauth";
import { prisma } from "@/lib/prisma";
import { normalizePlatform } from "@/lib/marketplace/types";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

async function authorize(request: NextRequest, permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const allowed = await checkUserPermission(session.user.id, permission);
  if (!allowed) return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

export async function GET(request: NextRequest) {
  const authz = await authorize(request, PERMISSIONS.LISTINGS_VIEW);
  if (authz.error) return authz.error;

  const flags = await getFeatureFlags();
  const connectors = listConnectors();
  await ensureMarketplaceFoundationSchema();
  const connections = await prisma.marketplaceConnection.findMany({
    orderBy: [{ marketplace: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      marketplace: true,
      externalAccountId: true,
      name: true,
      status: true,
      scopes: true,
      lastConnectedAt: true,
      shops: {
        orderBy: { name: "asc" },
        select: { id: true, marketplace: true, externalShopId: true, name: true, status: true },
      },
    },
  });
  const configuredByPlatform = new Map(await Promise.all(
    connectors.map(async (connector) => [connector.platform, await connector.isConfigured()] as const)
  ));

  return NextResponse.json({
    flags,
    platforms: connectors.map((connector) => {
      const missingConfiguration = connector.platform === "EBAY"
        ? ["EBAY_CLIENT_ID", "EBAY_CLIENT_SECRET", "EBAY_RU_NAME"].filter((name) => !String(process.env[name] || "").trim())
        : [
            !String(process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY || process.env.ETSY_KEYSTRING || "").trim() ? "ETSY_CLIENT_ID" : "",
            !String(process.env.ETSY_SHARED_SECRET || process.env.ETSY_API_SECRET || "").trim() ? "ETSY_SHARED_SECRET" : "",
            !String(process.env.ETSY_REDIRECT_URI || "").trim() ? "ETSY_REDIRECT_URI" : "",
          ].filter(Boolean);
      return {
        marketplace: connector.platform,
        configured: configuredByPlatform.get(connector.platform) ?? false,
        missingConfiguration,
      };
    }),
    connections,
  });
}

export async function POST(request: NextRequest) {
  const authz = await authorize(request, PERMISSIONS.SETTINGS_MANAGE);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => ({}));
  const platform = normalizePlatform(body?.marketplace);
  if (!platform) {
    return NextResponse.json({ error: "Invalid marketplace" }, { status: 400 });
  }

  const connector = getConnector(platform);
  if (!connector) {
    return NextResponse.json({ error: `No connector for ${platform}` }, { status: 400 });
  }
  if (!(await connector.isConfigured())) {
    return NextResponse.json(
      { error: `${platform} connector is not configured (missing client credentials)` },
      { status: 400 }
    );
  }

  const state = `${platform}_${crypto.randomUUID()}`;
  const statePayload = JSON.stringify({ platform, userId: authz.session.user.id });
  await prisma.setting.upsert({
    where: { key: `mp_oauth_state_${state}` },
    create: { key: `mp_oauth_state_${state}`, value: statePayload },
    update: { value: statePayload },
  });

  try {
    const authorizationUrl = await connector.getAuthorizationUrl(state);
    const parsedUrl = new URL(authorizationUrl);
    if (parsedUrl.protocol !== "https:") throw new Error("Marketplace authorization URL must use HTTPS.");
    return NextResponse.json({ authorizationUrl, state });
  } catch (error) {
    await prisma.setting.deleteMany({ where: { key: `mp_oauth_state_${state}` } }).catch(() => {});
    console.error(`[marketplace-oauth] Failed to start ${platform} authorization`, error);
    const message = error instanceof Error ? error.message : "Unable to create marketplace authorization URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authz = await authorize(request, PERMISSIONS.SETTINGS_MANAGE);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => ({}));
  const connectionId = String(body?.connectionId || "").trim();
  if (!connectionId) {
    return NextResponse.json({ error: "connectionId is required" }, { status: 400 });
  }

  await ensureMarketplaceFoundationSchema();
  await disconnect(connectionId);
  return NextResponse.json({ success: true });
}
