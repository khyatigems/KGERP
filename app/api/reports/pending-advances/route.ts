import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all advances with remaining amount > 0
    const advances = await prisma.customerAdvance.findMany({
      where: {
        remainingAmount: {
          gt: 0,
        },
      },
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

    const now = new Date();

    const data = advances.map((advance) => {
      const daysSinceCreation = Math.floor(
        (now.getTime() - new Date(advance.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        advanceId: advance.id,
        customerId: advance.customerId,
        customerName: advance.customer.name,
        customerPhone: advance.customer.phone,
        originalAmount: advance.amount,
        remainingAmount: advance.remainingAmount,
        adjustedAmount: advance.adjustedAmount,
        paymentMode: advance.paymentMode,
        notes: advance.notes,
        createdAt: advance.createdAt,
        daysSinceCreation,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to generate pending advances report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
