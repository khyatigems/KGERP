import { NextRequest, NextResponse } from "next/server";
import { getConnector } from "@/lib/marketplace/connectors";
import { normalizePlatform } from "@/lib/marketplace/types";
import { prisma } from "@/lib/prisma";

function getBaseUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || request.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const baseUrl = getBaseUrl(request);
  const settingsUrl = `${baseUrl}/settings/marketplace-connections`;

  if (error) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(`OAuth error: ${error}`)}`, request.nextUrl)
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Missing code or state")}`, request.nextUrl)
    );
  }

  const stateRow = await prisma.setting.findUnique({ where: { key: `mp_oauth_state_${state}` } });
  if (!stateRow?.value) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Invalid or expired state")}`, request.nextUrl)
    );
  }

  const platform = normalizePlatform(stateRow.value);
  if (!platform) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent("Invalid state value")}`, request.nextUrl)
    );
  }

  const connector = getConnector(platform);
  if (!connector) {
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(`No connector for ${platform}`)}`, request.nextUrl)
    );
  }

  try {
    await connector.exchangeAuthorizationCode(code, state);
    await prisma.setting.delete({ where: { key: `mp_oauth_state_${state}` } }).catch(() => {});
    return NextResponse.redirect(
      new URL(`${settingsUrl}?connected=${platform}`, request.nextUrl)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.redirect(
      new URL(`${settingsUrl}?error=${encodeURIComponent(message)}`, request.nextUrl)
    );
  }
}
