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
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        adjustments: {
          include: {
            sale: {
              select: {
                id: true,
                invoiceId: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      advances,
    });
  } catch (error) {
    console.error("Failed to fetch customer advances:", error);
    return NextResponse.json(
      { error: "Failed to fetch advances" },
      { status: 500 }
    );
  }
}
