import crypto from "crypto";
import { LoyaltyAccrualInput, LoyaltySettings, LoyaltyDatabaseTx } from "@/types/pdf-generation";

export async function accrueLoyaltyPoints(input: LoyaltyAccrualInput) {
  // Enhanced input validation
  if (!input.tx || !input.customerId || !input.invoiceId || !input.invoiceNumber || !input.invoiceDate) {
    throw new Error('Missing required parameters for loyalty accrual');
  }

  if (typeof input.invoiceTotal !== 'number' || input.invoiceTotal < 0) {
    throw new Error('Invalid invoice total: must be a non-negative number');
  }
  
  // Validate string inputs to prevent SQL injection
  if (typeof input.customerId !== 'string' || input.customerId.length === 0 || input.customerId.length > 255) {
    throw new Error('Invalid customer ID: must be a non-empty string with max 255 characters');
  }
  
  if (typeof input.invoiceId !== 'string' || input.invoiceId.length === 0 || input.invoiceId.length > 255) {
    throw new Error('Invalid invoice ID: must be a non-empty string with max 255 characters');
  }
  
  if (typeof input.invoiceNumber !== 'string' || input.invoiceNumber.length === 0 || input.invoiceNumber.length > 100) {
    throw new Error('Invalid invoice number: must be a non-empty string with max 100 characters');
  }
  
  if (!(input.invoiceDate instanceof Date) || isNaN(input.invoiceDate.getTime())) {
    throw new Error('Invalid invoice date: must be a valid Date object');
  }

  // Get loyalty settings with error handling
  const settingsRows = await input.tx.$queryRawUnsafe(
    `SELECT pointsPerRupee, redeemRupeePerPoint FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch((error: Error) => {
    console.error('Failed to fetch loyalty settings:', error);
    return [];
  }) as LoyaltySettings[];
  
  const settings = settingsRows?.[0];
  if (!settings || Number(settings.pointsPerRupee || 0) <= 0) {
    console.info(`No loyalty accrual: settings missing or rate is zero for customer ${input.customerId}`);
    return; // No accrual if settings missing or rate is zero
  }

  const pointsPerRupee = Math.max(0, Number(settings.pointsPerRupee || 0));
  const redeemRupeePerPoint = Math.max(0.0001, Number(settings.redeemRupeePerPoint || 1));
  
  // Validate numeric values
  if (isNaN(pointsPerRupee) || isNaN(redeemRupeePerPoint)) {
    console.error(`Invalid loyalty settings values: pointsPerRupee=${pointsPerRupee}, redeemRupeePerPoint=${redeemRupeePerPoint}`);
    return;
  }
  
  // Calculate points (exclude credit notes and loyalty redemption from accrual base)
  try {
    // Use atomic UPSERT operation to prevent race conditions
    const excludedPayments = await input.tx.$queryRawUnsafe(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM Payment 
       WHERE invoiceId = ? AND method IN ('CREDIT_NOTE', 'LOYALTY_REDEEM')`,
      input.invoiceId
    ) as Array<{ total: number }>;    
    const excludedAmount = Number(excludedPayments?.[0]?.total || 0);
    const accrualBase = Math.max(0, input.invoiceTotal - excludedAmount);
    
    const earnedPoints = Math.floor(accrualBase * pointsPerRupee * 100) / 100; // 2 decimal precision
    if (earnedPoints <= 0.009) {
      console.info(`No loyalty points earned: accrualBase=${accrualBase}, earnedPoints=${earnedPoints} for invoice ${input.invoiceNumber}`);
      return; // No points to award
    }

    const rupeeValue = earnedPoints * redeemRupeePerPoint;
    const entryId = crypto.randomUUID();
    
    // Atomic UPSERT operation to prevent duplicates and race conditions
    // This will either insert a new record or do nothing if one already exists
    const insertResult = await input.tx.$executeRawUnsafe(
      `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
       SELECT ?, ?, ?, 'EARN', ?, ?, ?, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1 FROM "LoyaltyLedger" 
         WHERE invoiceId = ? AND type = 'EARN' 
         LIMIT 1
       )`,
      entryId,
      input.customerId,
      input.invoiceId,
      earnedPoints,
      rupeeValue,
      `Points earned on invoice ${input.invoiceNumber}`,
      input.invoiceId
    );
    
    // Check if the insert actually happened (affected rows > 0)
    if (Number(insertResult) === 0) {
      console.info(`Loyalty points already awarded for invoice ${input.invoiceNumber} - no duplicate created`);
      return;
    }
    
    console.info(`Successfully accrued ${earnedPoints} points for customer ${input.customerId} on invoice ${input.invoiceNumber}`);
    
  } catch (error) {
    console.error(`Failed to accrue loyalty points for invoice ${input.invoiceNumber}:`, error);
    throw new Error(`Loyalty accrual failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
