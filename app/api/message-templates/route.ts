import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export async function PUT(request: NextRequest) {
  try {
    const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
    if (!perm.success) {
      return NextResponse.json({ success: false, message: perm.message }, { status: 403 });
    }
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await ensureBillfreePhase1Schema();
    const body = await request.json();
    const { id, key, title, body: templateBody, channel } = body;

    if (!id || !key || !title || !templateBody || !channel) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "MessageTemplate" 
       SET key = ?, title = ?, body = ?, channel = ?, updatedAt = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      key,
      title,
      templateBody,
      channel,
      id
    );

    await logActivity({
      entityType: "MessageTemplate",
      entityId: id,
      entityIdentifier: key,
      actionType: "UPDATE",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      newData: body as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, message: "Template updated successfully" });
  } catch (error) {
    console.error("Failed to update message template:", error);
    return NextResponse.json({ success: false, message: "Failed to update template" }, { status: 500 });
  }
}
