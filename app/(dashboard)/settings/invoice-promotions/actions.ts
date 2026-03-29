"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export type InvoicePromotionSettingsDto = {
  dobRewardAmount: number;
  anniversaryRewardAmount: number;
  enableReviewCta: boolean;
  enableReferralCta: boolean;
};

export type OfferBannerRow = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaLink: string | null;
  displayOn: string;
  audienceFilter: string;
  priority: number;
  isActive: number;
  startDate: string | null;
  endDate: string | null;
};

export async function getInvoicePromotionSettings() {
  await ensureBillfreePhase1Schema();
  const settingRows = await prisma.$queryRawUnsafe<Array<{
    dobRewardAmount: number;
    anniversaryRewardAmount: number;
    enableReviewCta: number;
    enableReferralCta: number;
  }>>(`SELECT dobRewardAmount, anniversaryRewardAmount, enableReviewCta, enableReferralCta FROM "InvoicePromotionSettings" WHERE id = 'default' LIMIT 1`).catch(() => []);
  const banners = await prisma.$queryRawUnsafe<OfferBannerRow[]>(
    `SELECT id, title, subtitle, imageUrl, ctaText, ctaLink, displayOn, audienceFilter, priority, isActive, startDate, endDate
     FROM "OfferBanner" ORDER BY priority DESC, createdAt DESC LIMIT 200`
  ).catch(() => []);
  const s = settingRows?.[0];
  return {
    settings: {
      dobRewardAmount: Number(s?.dobRewardAmount || 0),
      anniversaryRewardAmount: Number(s?.anniversaryRewardAmount || 0),
      enableReviewCta: Boolean(s?.enableReviewCta ?? 1),
      enableReferralCta: Boolean(s?.enableReferralCta ?? 0),
    },
    banners,
  };
}

export async function saveInvoicePromotionSettings(payload: InvoicePromotionSettingsDto) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();

  await prisma.$executeRawUnsafe(
    `INSERT OR REPLACE INTO "InvoicePromotionSettings"
      (id, dobRewardAmount, anniversaryRewardAmount, enableReviewCta, enableReferralCta, updatedAt)
     VALUES ('default', ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    Number(payload.dobRewardAmount || 0),
    Number(payload.anniversaryRewardAmount || 0),
    payload.enableReviewCta ? 1 : 0,
    payload.enableReferralCta ? 1 : 0
  );

  await logActivity({
    entityType: "Settings",
    entityId: "invoice-promotions",
    entityIdentifier: "Invoice Promotions",
    actionType: "UPDATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    newData: payload as unknown as Record<string, unknown>,
  });
  revalidatePath("/settings/invoice-promotions");
  return { success: true };
}

export async function createOfferBanner(payload: {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  displayOn?: string;
  audienceFilter?: string;
  priority?: number;
  startDate?: string;
  endDate?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();
  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "OfferBanner"
      (id, title, subtitle, imageUrl, ctaText, ctaLink, displayOn, audienceFilter, priority, isActive, startDate, endDate, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    id,
    String(payload.title || "").trim(),
    payload.subtitle || null,
    payload.imageUrl || null,
    payload.ctaText || null,
    payload.ctaLink || null,
    payload.displayOn || "invoice",
    payload.audienceFilter || "all",
    Number(payload.priority || 0),
    payload.startDate ? new Date(payload.startDate).toISOString() : null,
    payload.endDate ? new Date(payload.endDate).toISOString() : null
  );
  await logActivity({
    entityType: "OfferBanner",
    entityId: id,
    entityIdentifier: payload.title || "Banner",
    actionType: "CREATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    newData: payload as unknown as Record<string, unknown>,
  });
  revalidatePath("/settings/invoice-promotions");
  return { success: true };
}

export async function toggleOfferBanner(id: string, active: boolean) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  await ensureBillfreePhase1Schema();
  await prisma.$executeRawUnsafe(`UPDATE "OfferBanner" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`, active ? 1 : 0, id);
  revalidatePath("/settings/invoice-promotions");
  return { success: true };
}

