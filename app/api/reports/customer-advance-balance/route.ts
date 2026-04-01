import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get all advances with customer info
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

    // Group by customer
    const customerMap = new Map();

    for (const advance of advances) {
      const customerId = advance.customerId;
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: advance.customer.name,
          customerPhone: advance.customer.phone,
          totalAdvances: 0,
          totalReceived: 0,
          totalUsed: 0,
          totalRemaining: 0,
          lastAdvanceDate: null,
        });
      }

      const customer = customerMap.get(customerId);
      customer.totalAdvances += 1;
      customer.totalReceived += advance.amount;
      customer.totalUsed += advance.adjustedAmount;
      customer.totalRemaining += advance.remainingAmount;
      
      if (!customer.lastAdvanceDate || new Date(advance.createdAt) > new Date(customer.lastAdvanceDate)) {
        customer.lastAdvanceDate = advance.createdAt;
      }
    }

    const data = Array.from(customerMap.values()).sort((a, b) => 
      b.totalRemaining - a.totalRemaining
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to generate customer advance balance report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
