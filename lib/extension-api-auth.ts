import { NextRequest, NextResponse } from "next/server";

const LEGACY_DESKTOP_APP_TOKEN = "KHYATI_MEDIA_SYNC_SECRET_2026";

export function getExtensionApiToken() {
  return (
    process.env.KHYATI_MARKETPLACE_EXTENSION_TOKEN ||
    process.env.KHYATI_MEDIA_SYNC_TOKEN ||
    process.env.MEDIA_UPLOAD_TOKEN ||
    LEGACY_DESKTOP_APP_TOKEN
  );
}

export function getRequestBearerToken(request: NextRequest) {
  return (
    request.nextUrl.searchParams.get("token") ||
    request.headers.get("x-khyati-extension-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

export function requireExtensionApiToken(request: NextRequest) {
  const expectedToken = getExtensionApiToken();
  const token = getRequestBearerToken(request);

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ message: "Invalid or missing API token" }, { status: 401 });
  }

  return null;
}
