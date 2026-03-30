import { PrismaTx } from "@/lib/accounting";
import crypto from "crypto";

interface LoyaltyAccrualInput {
  tx: PrismaTx;
  customerId: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  invoiceDate: Date;
}

export async function accrueLoyaltyPoints(input: LoyaltyAccrualInput) {
  // Get loyalty settings
  const settingsRows = await input.tx.$queryRawUnsafe<Array<{
    pointsPerRupee: number;
    redeemRupeePerPoint: number;
  }>>(
    `SELECT pointsPerRupee, redeemRupeePerPoint FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch(() => []);
  
  const settings = settingsRows?.[0];
  if (!settings || Number(settings.pointsPerRupee || 0) <= 0) {
    // No accrual if settings missing or rate is zero
    return;
  }

  const pointsPerRupee = Math.max(0, Number(settings.pointsPerRupee || 0));
  const redeemRupeePerPoint = Math.max(0.0001, Number(settings.redeemRupeePerPoint || 1));
  
  // Calculate points (exclude credit notes and loyalty redemption from accrual base)
  const excludedPayments = await input.tx.$queryRawUnsafe<Array<{ total: number }>>(
    `SELECT COALESCE(SUM(amount), 0) as total
     FROM Payment 
     WHERE invoiceId = ? AND method IN ('CREDIT_NOTE', 'LOYALTY_REDEEM')`,
    input.invoiceId
  );
  const excludedAmount = Number(excludedPayments?.[0]?.total || 0);
  const accrualBase = Math.max(0, input.invoiceTotal - excludedAmount);
  
  const earnedPoints = Math.floor(accrualBase * pointsPerRupee * 100) / 100; // 2 decimal precision
  if (earnedPoints <= 0.009) {
    return; // No points to award
  }

  const rupeeValue = earnedPoints * redeemRupeePerPoint;

  // Insert EARN entry
  await input.tx.$executeRawUnsafe(
    `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
     VALUES (?, ?, ?, 'EARN', ?, ?, ?, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    input.customerId,
    input.invoiceId,
    earnedPoints,
    rupeeValue,
    `Points earned on invoice ${input.invoiceNumber}`
  );
}
