import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { normalizePlatform } from "@/lib/marketplace/types";
import { getFeatureFlag, FEATURE_FLAG_KEYS } from "@/lib/marketplace/feature-flags";
import { syncListingsForPlatform } from "@/lib/marketplace/sync-listings";
import { syncOrdersForPlatform } from "@/lib/marketplace/sync-orders";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const master = await getFeatureFlag(FEATURE_FLAG_KEYS.marketplaceApiSync);
  if (!master) {
    return NextResponse.json({ error: "Marketplace API sync is disabled" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const platform = normalizePlatform(body?.marketplace);
  const syncType = String(body?.syncType || "LISTINGS").toUpperCase();

  if (!platform) return NextResponse.json({ error: "Invalid marketplace" }, { status: 400 });
  if (syncType !== "LISTINGS" && syncType !== "ORDERS") {
    return NextResponse.json({ error: "syncType must be LISTINGS or ORDERS" }, { status: 400 });
  }

  const platformFlag =
    platform === "EBAY" ? FEATURE_FLAG_KEYS.ebaySync : FEATURE_FLAG_KEYS.etsySync;
  const platformEnabled = await getFeatureFlag(platformFlag);
  if (!platformEnabled) {
    return NextResponse.json({ error: `${platform} sync is disabled` }, { status: 403 });
  }

  await ensureMarketplaceFoundationSchema();

  try {
    const result =
      syncType === "LISTINGS"
        ? await syncListingsForPlatform(platform, { limit: body?.limit, offset: body?.offset })
        : await syncOrdersForPlatform(platform, { from: body?.from, limit: body?.limit, offset: body?.offset });
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const e = err as { message?: string; body?: unknown; status?: number };
    const detail = e.body ? JSON.stringify(e.body) : "";
    console.error("[marketplace-sync] failed:", e.message, detail);
    return NextResponse.json(
      { error: detail ? `${e.message} — ${detail}` : (e.message ?? String(err)) },
      { status: e.status === 403 ? 502 : 500 }
    );
  }
}
