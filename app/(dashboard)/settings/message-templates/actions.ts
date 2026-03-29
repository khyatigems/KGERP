"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export type MessageTemplateRow = {
  id: string;
  key: string;
  title: string;
  body: string;
  channel: string;
  isActive: number;
};

export async function getMessageTemplates() {
  await ensureBillfreePhase1Schema();
  return prisma.$queryRawUnsafe<MessageTemplateRow[]>(
    `SELECT id, key, title, body, channel, isActive
     FROM "MessageTemplate" ORDER BY createdAt DESC LIMIT 300`
  ).catch(() => []);
}

export async function createMessageTemplate(payload: {
  key: string;
  title: string;
  body: string;
  channel?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();

  const id = crypto.randomUUID();
  const key = String(payload.key || "").trim().toLowerCase();
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  if (!key || !title || !body) return { success: false, message: "Key, title and body are required" };

  await prisma.$executeRawUnsafe(
    `INSERT INTO "MessageTemplate" (id, key, title, body, channel, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    id,
    key,
    title,
    body,
    payload.channel || "WHATSAPP_WEB"
  );

  await logActivity({
    entityType: "MessageTemplate",
    entityId: id,
    entityIdentifier: key,
    actionType: "CREATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    newData: payload as unknown as Record<string, unknown>,
  });
  revalidatePath("/settings/message-templates");
  return { success: true };
}

export async function toggleMessageTemplate(id: string, active: boolean) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  await ensureBillfreePhase1Schema();
  await prisma.$executeRawUnsafe(`UPDATE "MessageTemplate" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, active ? 1 : 0, id);
  revalidatePath("/settings/message-templates");
  return { success: true };
}

