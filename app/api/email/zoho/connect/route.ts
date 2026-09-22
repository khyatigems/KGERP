import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { ZohoMailConnector } from "@/lib/email/connectors/zoho";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const connector = new ZohoMailConnector();
  if (!connector.isConfigured()) {
    return NextResponse.json(
      { error: "Zoho client credentials not configured (ZOHO_CLIENT_ID/SECRET/REDIRECT_URI)" },
      { status: 400 }
    );
  }

  const state = `zoho_${crypto.randomUUID()}`;
  await prisma.setting.upsert({
    where: { key: `zoho_oauth_state_${state}` },
    create: { key: `zoho_oauth_state_${state}`, value: "pending" },
    update: { value: "pending" },
  });

  const authorizationUrl = connector.getAuthorizationUrl(state);
  return NextResponse.json({ authorizationUrl });
}
