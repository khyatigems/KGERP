import { NextRequest, NextResponse } from "next/server";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.json({ error: `OAuth error: ${error}` }, { status: 400 });
  }
  if (!code || !state) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 });
  }

  const stateRow = await prisma.setting.findUnique({ where: { key: `zoho_oauth_state_${state}` } });
  if (!stateRow) {
    return NextResponse.json({ error: "Invalid or expired state" }, { status: 400 });
  }

  const connector = new ZohoMailConnector();
  try {
    await connector.exchangeAuthorizationCode(code);
    await prisma.setting.delete({ where: { key: `zoho_oauth_state_${state}` } }).catch(() => {});
    return NextResponse.redirect(new URL("/settings/email-templates", request.nextUrl));
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
