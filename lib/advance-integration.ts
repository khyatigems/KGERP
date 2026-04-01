"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Get available advance balance for a customer
 * This can be called during payment recording to show available advance
 */
export async function getCustomerAvailableAdvance(customerId: string) {
  try {
    const advances = await prisma.customerAdvance.findMany({
      where: {
        customerId,
        remainingAmount: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: "asc", // Oldest first (FIFO)
      },
    });

    const totalAvailable = advances.reduce(
      (sum: number, advance: { remainingAmount: number }) => sum + advance.remainingAmount,
      0
    );

    return {
      success: true,
      totalAvailable,
      advances: advances.map((a) => ({
        id: a.id,
        remainingAmount: a.remainingAmount,
        originalAmount: a.amount,
        createdAt: a.createdAt,
        notes: a.notes,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch customer advance:", error);
    return { error: "Failed to fetch advance balance" };
  }
}

/**
 * Apply customer advance against an invoice/sale
 * This should be called when recording a payment with advance usage
 */
export async function applyAdvanceToInvoice(
  customerId: string,
  saleId: string,
  amountToApply: number
) {
  try {
    // Get available advances (oldest first for FIFO)
    const advances = await prisma.customerAdvance.findMany({
      where: {
        customerId,
        remainingAmount: {
          gt: 0,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const totalAvailable = advances.reduce(
      (sum, a) => sum + a.remainingAmount,
      0
    );

    if (totalAvailable < amountToApply) {
      return { error: "Insufficient advance balance" };
    }

    let remainingToApply = amountToApply;
    const adjustments = [];

    // Apply to advances in FIFO order
    for (const advance of advances) {
      if (remainingToApply <= 0) break;

      const amountFromThisAdvance = Math.min(
        advance.remainingAmount,
        remainingToApply
      );

      // Create adjustment record
      await prisma.customerAdvanceAdjustment.create({
        data: {
          advanceId: advance.id,
          saleId,
          amountUsed: amountFromThisAdvance,
        },
      });

      // Update advance
      await prisma.customerAdvance.update({
        where: { id: advance.id },
        data: {
          remainingAmount: advance.remainingAmount - amountFromThisAdvance,
          adjustedAmount: advance.adjustedAmount + amountFromThisAdvance,
          isAdjusted:
            advance.remainingAmount - amountFromThisAdvance === 0
              ? true
              : advance.isAdjusted,
        },
      });

      adjustments.push({
        advanceId: advance.id,
        amountUsed: amountFromThisAdvance,
      });

      remainingToApply -= amountFromThisAdvance;
    }

    revalidatePath("/advances");
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/customers");

    return {
      success: true,
      totalApplied: amountToApply,
      adjustments,
    };
  } catch (error) {
    console.error("Failed to apply advance:", error);
    return { error: "Failed to apply advance to invoice" };
  }
}

/**
 * Release advance back to customer (for refunds/cancellations)
 */
export async function releaseAdvanceFromInvoice(
  saleId: string,
  adjustmentId: string
) {
  try {
    const adjustment = await prisma.customerAdvanceAdjustment.findUnique({
      where: { id: adjustmentId },
      include: { advance: true },
    });

    if (!adjustment) {
      return { error: "Adjustment not found" };
    }

    // Restore the advance amount
    await prisma.customerAdvance.update({
      where: { id: adjustment.advanceId },
      data: {
        remainingAmount: adjustment.advance.remainingAmount + adjustment.amountUsed,
        adjustedAmount: adjustment.advance.adjustedAmount - adjustment.amountUsed,
        isAdjusted: false,
      },
    });

    // Delete the adjustment record
    await prisma.customerAdvanceAdjustment.delete({
      where: { id: adjustmentId },
    });

    revalidatePath("/advances");
    revalidatePath(`/sales/${saleId}`);

    return { success: true };
  } catch (error) {
    console.error("Failed to release advance:", error);
    return { error: "Failed to release advance" };
  }
}
