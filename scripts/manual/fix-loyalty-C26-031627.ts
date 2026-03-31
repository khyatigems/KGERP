import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import crypto from "crypto";

/**
 * Fix wrongly credited loyalty points for customer C26-031627
 * Customer ID: 9281b29e-17fb-4d88-ba9b-e9315bb6ab3c
 * Invoice: INV-2026-0018
 * Points to deduct: 223.65
 */

async function main() {
  const customerId = "9281b29e-17fb-4d88-ba9b-e9315bb6ab3c";
  const pointsToDeduct = 223.65;
  const invoiceNumber = "INV-2026-0018";
  const reason = "Technical issue resolved";

  console.log(`\n🔧 Fixing loyalty points for customer ${customerId}`);
  console.log(`   Customer Code: C26-031627`);
  console.log(`   Deducting: ${pointsToDeduct} points`);
  console.log(`   Invoice: ${invoiceNumber}`);
  console.log(`   Reason: ${reason}\n`);

  try {
    // Get current loyalty points
    const currentPoints = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
      `SELECT ROUND(COALESCE(SUM(points),0)) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
      customerId
    );
    
    const availablePoints = Number(currentPoints?.[0]?.points || 0);
    console.log(`   Current points balance: ${availablePoints}`);
    
    if (availablePoints < pointsToDeduct) {
      console.error(`   ❌ ERROR: Cannot deduct ${pointsToDeduct} points. Customer only has ${availablePoints} points.`);
      process.exit(1);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Create a REDEEM entry to deduct points
    await prisma.$executeRawUnsafe(
      `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
       VALUES (?, ?, NULL, 'REDEEM', ?, ?, ?, ?)`,
      id,
      customerId,
      -Math.abs(pointsToDeduct), // Negative points to deduct
      -Math.abs(pointsToDeduct), // Negative rupee value
      `Adjustment: ${reason} (Invoice: ${invoiceNumber})`,
      now
    );

    console.log(`   ✅ Created adjustment entry: ${id}`);
    console.log(`   ✅ Deducted ${pointsToDeduct} points`);
    console.log(`   ✅ New balance: ${availablePoints - pointsToDeduct}\n`);

    // Log activity (without session - using system user)
    await logActivity({
      entityType: "LoyaltyLedger",
      entityId: id,
      entityIdentifier: customerId,
      actionType: "ADJUST",
      source: "SYSTEM",
      userId: "system",
      userName: "System Admin",
      description: `Adjusted loyalty points: -${pointsToDeduct} points for ${reason} (Invoice: ${invoiceNumber})`,
    });

    console.log(`   ✅ Activity logged\n`);
    console.log(`🎉 Loyalty points adjustment completed successfully!`);

  } catch (error) {
    console.error("   ❌ ERROR:", error);
    process.exit(1);
  }
}

main();
