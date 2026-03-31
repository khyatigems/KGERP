import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";

/**
 * Adjust or delete loyalty points for a customer
 * Use this when points were wrongly credited
 */

export async function adjustLoyaltyPoints(
  customerId: string,
  pointsToDeduct: number,
  reason: string,
  invoiceNumber?: string
) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // Get current loyalty points
    const currentPoints = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
      `SELECT ROUND(COALESCE(SUM(points),0)) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
      customerId
    );
    
    const availablePoints = Number(currentPoints?.[0]?.points || 0);
    
    if (availablePoints < pointsToDeduct) {
      return { 
        success: false, 
        message: `Cannot deduct ${pointsToDeduct} points. Customer only has ${availablePoints} points available.` 
      };
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
      `Adjustment: ${reason}${invoiceNumber ? ` (Invoice: ${invoiceNumber})` : ''}`,
      now
    );

    // Log activity
    await logActivity({
      entityType: "LoyaltyLedger",
      entityId: id,
      entityIdentifier: customerId,
      actionType: "ADJUST",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      description: `Adjusted loyalty points: -${pointsToDeduct} points for ${reason}`,
    });

    return { 
      success: true, 
      message: `Successfully deducted ${pointsToDeduct} points from customer.`,
      newBalance: availablePoints - pointsToDeduct
    };
  } catch (error) {
    console.error("Error adjusting loyalty points:", error);
    return { success: false, message: "Failed to adjust loyalty points" };
  }
}

/**
 * Delete a specific loyalty ledger entry
 * Use with caution - only for wrongly created entries
 */
export async function deleteLoyaltyEntry(entryId: string, reason: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: "Unauthorized" };
  }

  try {
    // Get entry details before deletion for logging
    const entry = await prisma.$queryRawUnsafe<Array<{
      id: string;
      customerId: string;
      points: number;
      type: string;
      remarks: string;
    }>>(
      `SELECT id, customerId, points, type, remarks FROM "LoyaltyLedger" WHERE id = ? LIMIT 1`,
      entryId
    );

    if (!entry || entry.length === 0) {
      return { success: false, message: "Loyalty entry not found" };
    }

    const entryDetails = entry[0];

    // Delete the entry
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LoyaltyLedger" WHERE id = ?`,
      entryId
    );

    // Log activity
    await logActivity({
      entityType: "LoyaltyLedger",
      entityId: entryId,
      entityIdentifier: entryDetails.customerId,
      actionType: "DELETE",
      source: "WEB",
      userId: session.user.id,
      userName: session.user.name || session.user.email || "Unknown",
      description: `Deleted loyalty entry: ${entryDetails.type} ${entryDetails.points} points. Reason: ${reason}`,
    });

    return { 
      success: true, 
      message: `Successfully deleted loyalty entry (${entryDetails.type} ${Math.abs(entryDetails.points)} points).` 
    };
  } catch (error) {
    console.error("Error deleting loyalty entry:", error);
    return { success: false, message: "Failed to delete loyalty entry" };
  }
}

// Manual usage examples:
// 1. To adjust points for dummy 2 (223.65 points from INV-2026-0018):
//    adjustLoyaltyPoints("CUSTOMER_ID_HERE", 223.65, "Wrongly credited points", "INV-2026-0018")
//
// 2. To delete a specific entry by ID:
//    deleteLoyaltyEntry("ENTRY_ID_HERE", "Entry created by mistake")
