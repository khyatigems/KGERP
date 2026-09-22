import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import {
  listEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  toggleEmailTemplate,
} from "@/lib/email/templates";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const templates = await listEmailTemplates();
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const result = await createEmailTemplate({
    key: body?.key,
    title: body?.title,
    subject: body?.subject,
    htmlBody: body?.htmlBody,
    plainTextBody: body?.plainTextBody,
  });
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkUserPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  if (body?.action === "toggle") {
    const result = await toggleEmailTemplate(body.id, Boolean(body.active));
    return NextResponse.json(result);
  }
  const result = await updateEmailTemplate({
    id: body?.id,
    title: body?.title,
    subject: body?.subject,
    htmlBody: body?.htmlBody,
    plainTextBody: body?.plainTextBody,
  });
  if (!result.success) return NextResponse.json(result, { status: 400 });
  return NextResponse.json(result);
}
