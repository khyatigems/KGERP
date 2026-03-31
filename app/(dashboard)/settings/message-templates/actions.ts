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

const DEFAULT_TEMPLATES: Array<{ key: string; title: string; body: string; channel: string }> = [
  {
    key: "birthday_wish",
    title: "Birthday Wishes",
    body: [
      "Dear {name},",
      "",
      "Happy Birthday from all of us at KhyatiGems™! May your year shine as brightly as our gemstones.",
      "Treat yourself with your exclusive gift coupon {coupon}. We’ve also added your loyalty balance of {points} points for your next purchase.",
      "",
      "Warm regards,",
      "Team KhyatiGems™"
    ].join("\n"),
    channel: "WHATSAPP_WEB",
  },
  {
    key: "anniversary_wish",
    title: "Anniversary Wishes",
    body: [
      "Dear {name},",
      "",
      "Heartiest congratulations on your special day! Wishing you many more sparkling memories together.",
      "Celebrate with an exclusive offer {coupon}. Your loyalty balance stands at {points} points—redeem them on your next visit.",
      "",
      "Warm regards,",
      "Team KhyatiGems™"
    ].join("\n"),
    channel: "WHATSAPP_WEB",
  },
  {
    key: "general_wish",
    title: "Seasonal Greeting",
    body: [
      "Dear {name},",
      "",
      "Thank you for being a valued member of the KhyatiGems™ family.",
      "Explore our latest collections and enjoy curated offers. Remember, you currently have {points} loyalty points waiting for you.",
      "",
      "Warm regards,",
      "Team KhyatiGems™"
    ].join("\n"),
    channel: "WHATSAPP_WEB",
  },
  {
    key: "sales_invoice",
    title: "Invoice Notification",
    body: [
      "Dear {name},",
      "",
      "Thank you for choosing KhyatiGems™. Your invoice {invoice} dated {date} is ready for your records.",
      "You can review it securely here: {invoice_link}",
      "If you have any questions or need assistance, simply reply to this message—our team is happy to help.",
      "",
      "Warm regards,",
      "Team KhyatiGems™"
    ].join("\n"),
    channel: "WHATSAPP_WEB",
  },
  {
    key: "loyalty_reminder",
    title: "Loyalty Reminder",
    body: [
      "Dear {name},",
      "",
      "We noticed you have {points} loyalty points waiting to be redeemed at KhyatiGems™.",
      "Visit us soon or shop online and combine your points with exclusive coupons like {coupon} for extra savings.",
      "",
      "Warm regards,",
      "Team KhyatiGems™"
    ].join("\n"),
    channel: "WHATSAPP_WEB",
  },
];

async function ensureDefaultMessageTemplates() {
  try {
    await ensureBillfreePhase1Schema();
    const existing = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      `SELECT key FROM "MessageTemplate" WHERE key IN (${DEFAULT_TEMPLATES.map(() => "?").join(", ")})`,
      ...DEFAULT_TEMPLATES.map((tpl) => tpl.key)
    ).catch(() => []);
    const existingKeys = new Set((existing || []).map((row) => row.key));

    for (const template of DEFAULT_TEMPLATES) {
      if (existingKeys.has(template.key)) continue;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "MessageTemplate" (id, key, title, body, channel, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)` ,
        crypto.randomUUID(),
        template.key,
        template.title,
        template.body,
        template.channel
      ).catch(() => {});
    }
  } catch (error) {
    console.error("Failed to ensure default message templates:", error);
  }
}

export async function getMessageTemplates() {
  try {
    await ensureDefaultMessageTemplates();
    return prisma.$queryRawUnsafe<MessageTemplateRow[]>(
      `SELECT id, key, title, body, channel, isActive
       FROM "MessageTemplate" ORDER BY createdAt DESC LIMIT 300`
    ).catch(() => []);
  } catch (error) {
    console.error("Failed to get message templates:", error);
    return [];
  }
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

