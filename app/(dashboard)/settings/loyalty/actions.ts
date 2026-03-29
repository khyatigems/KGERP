"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity-logger";

export type LoyaltySettingsDto = {
  pointsPerRupee: number;
  redeemRupeePerPoint: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  dobProfilePoints: number;
  anniversaryProfilePoints: number;
  expiryDays: number | null;
};

export async function getLoyaltySettings(): Promise<LoyaltySettingsDto> {
  await ensureBillfreePhase1Schema();
  const rows = await prisma.$queryRawUnsafe<Array<{
    pointsPerRupee: number;
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
    dobProfilePoints: number;
    anniversaryProfilePoints: number;
    expiryDays: number | null;
  }>>(
    `SELECT pointsPerRupee, redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent, dobProfilePoints, anniversaryProfilePoints, expiryDays
     FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch(() => []);
  const row = rows?.[0];
  if (!row) {
    return {
      pointsPerRupee: 0.01,
      redeemRupeePerPoint: 1,
      minRedeemPoints: 0,
      maxRedeemPercent: 30,
      dobProfilePoints: 0,
      anniversaryProfilePoints: 0,
      expiryDays: null,
    };
  }
  return {
    pointsPerRupee: Number(row.pointsPerRupee || 0.01),
    redeemRupeePerPoint: Number(row.redeemRupeePerPoint || 1),
    minRedeemPoints: Number(row.minRedeemPoints || 0),
    maxRedeemPercent: Number(row.maxRedeemPercent || 30),
    dobProfilePoints: Number(row.dobProfilePoints || 0),
    anniversaryProfilePoints: Number(row.anniversaryProfilePoints || 0),
    expiryDays: row.expiryDays == null ? null : Number(row.expiryDays),
  };
}

export async function saveLoyaltySettings(payload: LoyaltySettingsDto) {
  const perm = await checkPermission(PERMISSIONS.SETTINGS_MANAGE);
  if (!perm.success) return { success: false, message: perm.message };

  const session = await auth();
  if (!session?.user) return { success: false, message: "Unauthorized" };
  await ensureBillfreePhase1Schema();

  const clean = {
    pointsPerRupee: Math.max(0, Number(payload.pointsPerRupee || 0)),
    redeemRupeePerPoint: Math.max(0.0001, Number(payload.redeemRupeePerPoint || 1)),
    minRedeemPoints: Math.max(0, Number(payload.minRedeemPoints || 0)),
    maxRedeemPercent: Math.min(100, Math.max(0, Number(payload.maxRedeemPercent || 0))),
    dobProfilePoints: Math.max(0, Number(payload.dobProfilePoints || 0)),
    anniversaryProfilePoints: Math.max(0, Number(payload.anniversaryProfilePoints || 0)),
    expiryDays: payload.expiryDays == null ? null : Math.max(0, Number(payload.expiryDays)),
  };

  await prisma.$executeRawUnsafe(
    `INSERT OR REPLACE INTO "LoyaltySettings"
      (id, pointsPerRupee, redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent, dobProfilePoints, anniversaryProfilePoints, expiryDays, updatedAt)
     VALUES ('default', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    clean.pointsPerRupee,
    clean.redeemRupeePerPoint,
    clean.minRedeemPoints,
    clean.maxRedeemPercent,
    clean.dobProfilePoints,
    clean.anniversaryProfilePoints,
    clean.expiryDays
  );

  await logActivity({
    entityType: "Settings",
    entityId: "loyalty",
    entityIdentifier: "Loyalty Settings",
    actionType: "UPDATE",
    source: "WEB",
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Unknown",
    newData: clean as unknown as Record<string, unknown>,
  });

  revalidatePath("/settings/loyalty");
  return { success: true };
}
