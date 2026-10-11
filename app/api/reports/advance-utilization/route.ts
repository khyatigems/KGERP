import { auth } from "@/lib/auth";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.REPORTS_VIEW))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    // Get all adjustments with related data
    const adjustments = await prisma.customerAdvanceAdjustment.findMany({
      include: {
        advance: {
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        sale: {
          select: {
            id: true,
            invoiceId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const data = adjustments.map((adj) => ({
      adjustmentId: adj.id,
      advanceId: adj.advanceId,
      customerId: adj.advance.customer.id,
      customerName: adj.advance.customer.name,
      saleId: adj.saleId,
      invoiceNumber: adj.sale?.invoiceId || null,
      amountUsed: adj.amountUsed,
      advanceAmount: adj.advance.amount,
      originalAdvanceDate: adj.advance.createdAt,
      adjustmentDate: adj.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to generate advance utilization report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}
