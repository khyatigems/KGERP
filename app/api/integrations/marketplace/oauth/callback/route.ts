import { NextRequest, NextResponse } from "next/server";
import { getConnector } from "@/lib/marketplace/connectors";
import { normalizePlatform } from "@/lib/marketplace/types";
import { prisma } from "@/lib/prisma";
import { ensureMarketplaceFoundationSchema } from "@/lib/marketplace-foundation";
import { saveTokens } from "@/lib/marketplace/oauth";
import { logMarketplaceActivity } from "@/lib/marketplace-control-center";
import { isEtsyAppProfile, normalizeEtsyAppProfile } from "@/lib/marketplace/connectors/etsy";

function getBaseUrl(request: NextRequest): string {
  const configuredUrl = (process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || "").trim();
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch {
      console.warn("[marketplace-oauth] Ignoring invalid APP_BASE_URL/NEXTAUTH_URL");
    }
  }
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");
  const baseUrl = getBaseUrl(request);
  const settingsUrl = `${baseUrl}/settings/marketplace-connections`;

  if (error) {
    const message = errorDescription ? `OAuth error: ${error} (${errorDescription})` : `OAuth error: ${error}`;
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(message)}`, request.nextUrl)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Missing code or state")}`, request.nextUrl)
    );
  }

  await ensureMarketplaceFoundationSchema();
  const stateKey = `mp_oauth_state_${state}`;
  const stateRow = await prisma.setting.findUnique({ where: { key: stateKey } });
  if (!stateRow?.value) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Invalid or expired state")}`, request.nextUrl)
    );
  }

  let statePayload: { platform?: string; userId?: string; appProfile?: string; pkceKey?: string; expiresAt?: string };
  try {
    statePayload = JSON.parse(stateRow.value);
  } catch {
    statePayload = { platform: stateRow.value };
  }
  const platform = normalizePlatform(statePayload.platform);
  if (!platform) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Invalid state value")}`, request.nextUrl)
    );
  }
  const appProfile = platform === "ETSY" ? normalizeEtsyAppProfile(statePayload.appProfile) : undefined;
  if (platform === "ETSY" && (!isEtsyAppProfile(statePayload.appProfile) || statePayload.pkceKey !== `etsy_pkce_${state}`)) {
    return NextResponse.redirect(new URL(`${settingsUrl}?error=${encodeURIComponent("Invalid Etsy authorization context")}`, request.nextUrl));
  }
  if (!statePayload.expiresAt || Number.isNaN(Date.parse(statePayload.expiresAt)) || Date.parse(statePayload.expiresAt) <= Date.now()) {
    await prisma.setting.deleteMany({ where: { key: stateKey } }).catch(() => {});
    return NextResponse.redirect(new URL(`${settingsUrl}?error=${encodeURIComponent("OAuth state expired; reconnect and try again")}`, request.nextUrl));
  }

  const connector = getConnector(platform);
  if (!connector) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(`No connector for ${platform}`)}`, request.nextUrl)
    );
  }

  const consumedState = await prisma.setting.deleteMany({ where: { key: stateKey } });
  if (consumedState.count !== 1) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("OAuth state was already used")}`, request.nextUrl)
    );
  }

  try {
      const result = await connector.exchangeAuthorizationCode(code, state, { appProfile });
      const connectionId = await saveTokens(
        platform,
        result.externalAccountId,
        result.accountName,
        result.tokens,
        { oauthAppProfile: appProfile }
      );
      for (const shop of result.shops) {
        await prisma.marketplaceShop.upsert({
          where: {
            marketplace_externalShopId: {
              marketplace: platform,
              externalShopId: shop.externalShopId,
            },
          },
          create: {
            connectionId,
            marketplace: platform,
            externalShopId: shop.externalShopId,
            name: shop.name,
          },
          update: { connectionId, name: shop.name, status: "CONNECTED" },
        });
      }
      await logMarketplaceActivity({
        entityType: "MarketplaceConnection",
        entityId: connectionId,
        entityIdentifier: `${platform}: ${result.accountName}`,
        actionType: "SHOP_CONNECTED",
        details: `${platform} account connected with ${result.shops.length} shop${result.shops.length === 1 ? "" : "s"}`,
        userId: statePayload.userId,
        source: "WEB",
        metadata: { marketplace: platform, shopCount: result.shops.length },
      });
    return NextResponse.redirect(
      new URL(`${settingsUrl}?connected=${platform}&shops=${result.shops.length}`, request.nextUrl)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(message)}`, request.nextUrl)
    );
  }
}
