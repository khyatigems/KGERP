import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, type Permission } from "@/lib/permissions";
import { PERMISSIONS } from "@/lib/permissions";
import { getConnector, listConnectors } from "@/lib/marketplace/connectors";
import { getFeatureFlags } from "@/lib/marketplace/feature-flags";
import { getConnectionStatus, disconnect } from "@/lib/marketplace/oauth";
import { prisma } from "@/lib/prisma";
import type { MarketplacePlatform } from "@/lib/marketplace/types";
import { normalizePlatform } from "@/lib/marketplace/types";

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
  const statuses = await Promise.all(
    connectors.map(async (c) => ({
      marketplace: c.platform,
      configured: await c.isConfigured(),
      status: await getConnectionStatus(c.platform),
    }))
  );

  return NextResponse.json({ flags, connections: statuses });
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
  await prisma.setting.upsert({
    where: { key: `mp_oauth_state_${state}` },
    create: { key: `mp_oauth_state_${state}`, value: platform },
    update: { value: platform },
  });

  const authorizationUrl = connector.getAuthorizationUrl(state);
  return NextResponse.json({ authorizationUrl, state });
}

export async function DELETE(request: NextRequest) {
  const authz = await authorize(request, PERMISSIONS.SETTINGS_MANAGE);
  if (authz.error) return authz.error;

  const body = await request.json().catch(() => ({}));
  const platform = normalizePlatform(body?.marketplace);
  if (!platform) {
    return NextResponse.json({ error: "Invalid marketplace" }, { status: 400 });
  }

  await disconnect(platform as MarketplacePlatform);
  return NextResponse.json({ success: true });
}
