"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity-logger";

export type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  maxDiscount: number | null;
  minInvoiceAmount: number | null;
  validFrom: string | null;
  validTo: string | null;
  usageLimitTotal: number | null;
  usageLimitPerCustomer: number | null;
  applicableScope: string;
  isActive: number;
};

export async function getCoupons() {
  await ensureBillfreePhase1Schema();
  return prisma.$queryRawUnsafe<CouponRow[]>(
    `SELECT id, code, type, value, maxDiscount, minInvoiceAmount, validFrom, validTo,
            usageLimitTotal, usageLimitPerCustomer, applicableScope, isActive
     FROM "Coupon" ORDER BY createdAt DESC LIMIT 300`
  ).catch(() => []);
}

export async function createCoupon(input: {
  code: string;
  type: "FLAT" | "PERCENT";
  value: number;
  maxDiscount?: number | null;
  minInvoiceAmount?: number | null;
  validFrom?: string | null;
  validTo?: string | null;
  usageLimitTotal?: number | null;
  usageLimitPerCustomer?: number | null;
  applicableScope?: string;
}) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();

  const code = String(input.code || "").trim().toUpperCase();
  if (!code) return { success: false, message: "Coupon code is required" };
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) return { success: false, message: "Coupon code format invalid" };

  const id = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Coupon"
      (id, code, type, value, maxDiscount, minInvoiceAmount, validFrom, validTo, usageLimitTotal, usageLimitPerCustomer, applicableScope, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    id,
    code,
    input.type === "PERCENT" ? "PERCENT" : "FLAT",
    Number(input.value || 0),
    input.maxDiscount == null || input.maxDiscount === 0 ? null : Number(input.maxDiscount),
    input.minInvoiceAmount == null || input.minInvoiceAmount === 0 ? null : Number(input.minInvoiceAmount),
    input.validFrom ? new Date(input.validFrom).toISOString() : null,
    input.validTo ? new Date(input.validTo).toISOString() : null,
    input.usageLimitTotal == null || input.usageLimitTotal === 0 ? null : Number(input.usageLimitTotal),
    input.usageLimitPerCustomer == null || input.usageLimitPerCustomer === 0 ? null : Number(input.usageLimitPerCustomer),
    input.applicableScope || "all"
  );

  await logActivity({
    entityType: "Coupon",
    entityId: id,
    entityIdentifier: code,
    actionType: "CREATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    newData: { ...input, code } as unknown as Record<string, unknown>,
  });

  revalidatePath("/settings/coupons");
  return { success: true };
}

export async function toggleCoupon(id: string, active: boolean) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };
  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();

  await prisma.$executeRawUnsafe(
    `UPDATE "Coupon" SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
    active ? 1 : 0,
    id
  );
  await logActivity({
    entityType: "Coupon",
    entityId: id,
    entityIdentifier: id,
    actionType: "UPDATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    details: active ? "Coupon activated" : "Coupon disabled",
  });
  revalidatePath("/settings/coupons");
  return { success: true };
}

