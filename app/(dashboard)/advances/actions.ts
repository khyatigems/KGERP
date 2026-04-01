"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const recordAdvanceSchema = z.object({
  customerId: z.string(),
  amount: z.string().transform((val) => parseFloat(val)),
  paymentMode: z.string(),
  paymentRef: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordAdvance(formData: FormData) {
  try {
    const data = recordAdvanceSchema.parse({
      customerId: formData.get("customerId"),
      amount: formData.get("amount"),
      paymentMode: formData.get("paymentMode"),
      paymentRef: formData.get("paymentRef") || undefined,
      notes: formData.get("notes") || undefined,
    });

    const advance = await prisma.customerAdvance.create({
      data: {
        customerId: data.customerId,
        amount: data.amount,
        remainingAmount: data.amount,
        paymentMode: data.paymentMode,
        paymentRef: data.paymentRef,
        notes: data.notes,
      },
    });

    revalidatePath("/advances");
    return { success: true, data: advance };
  } catch (error) {
    console.error("Failed to record advance:", error);
    if (error instanceof z.ZodError) {
      return { error: "Invalid input data" };
    }
    return { error: "Failed to record advance" };
  }
}

export async function getAdvances() {
  try {
    const advances = await prisma.customerAdvance.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: advances.map((advance) => ({
        id: advance.id,
        customerId: advance.customerId,
        customerName: advance.customer.name,
        customerMobile: advance.customer.phone || "",
        amount: advance.amount,
        remainingAmount: advance.remainingAmount,
        adjustedAmount: advance.adjustedAmount,
        paymentMode: advance.paymentMode,
        paymentRef: advance.paymentRef,
        notes: advance.notes,
        isAdjusted: advance.isAdjusted,
        createdAt: advance.createdAt,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch advances:", error);
    return { error: "Failed to fetch advances" };
  }
}

export async function getCustomerAdvanceBalance(customerId: string) {
  try {
    const advances = await prisma.customerAdvance.findMany({
      where: {
        customerId,
        remainingAmount: {
          gt: 0,
        },
      },
    });

    const totalBalance = advances.reduce(
      (sum: number, advance: { remainingAmount: number }) => sum + advance.remainingAmount,
      0
    );

    return {
      success: true,
      balance: totalBalance,
      advances: advances.map((a: { id: string; amount: number; remainingAmount: number; createdAt: Date }) => ({
        id: a.id,
        originalAmount: a.amount,
        remainingAmount: a.remainingAmount,
        createdAt: a.createdAt,
      })),
    };
  } catch (error) {
    console.error("Failed to fetch customer advance balance:", error);
    return { error: "Failed to fetch advance balance" };
  }
}

export async function adjustAdvanceAgainstInvoice(
  advanceId: string,
  saleId: string,
  amountToUse: number
) {
  try {
    const advance = await prisma.customerAdvance.findUnique({
      where: { id: advanceId },
    });

    if (!advance) {
      return { error: "Advance not found" };
    }

    if (advance.remainingAmount < amountToUse) {
      return { error: "Insufficient advance balance" };
    }

    const updatedAdvance = await prisma.$transaction(async (tx) => {
      // Create adjustment record
      await tx.customerAdvanceAdjustment.create({
        data: {
          advanceId,
          saleId,
          amountUsed: amountToUse,
        },
      });

      // Update advance remaining amount
      const newRemaining = advance.remainingAmount - amountToUse;
      const newAdjusted = advance.adjustedAmount + amountToUse;

      return await tx.customerAdvance.update({
        where: { id: advanceId },
        data: {
          remainingAmount: newRemaining,
          adjustedAmount: newAdjusted,
          isAdjusted: newRemaining === 0,
        },
      });
    });

    revalidatePath("/advances");
    revalidatePath(`/sales/${saleId}`);
    return { success: true, data: updatedAdvance };
  } catch (error) {
    console.error("Failed to adjust advance:", error);
    return { error: "Failed to adjust advance" };
  }
}
