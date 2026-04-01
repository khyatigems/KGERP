import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: customerId } = await params;

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
      (sum, advance) => sum + advance.remainingAmount,
      0
    );

    return NextResponse.json({
      success: true,
      totalAvailable,
      advances: advances.map((a) => ({
        id: a.id,
        remainingAmount: a.remainingAmount,
        originalAmount: a.amount,
        createdAt: a.createdAt,
        notes: a.notes,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch customer advances:", error);
    return NextResponse.json(
      { error: "Failed to fetch advances" },
      { status: 500 }
    );
  }
}
