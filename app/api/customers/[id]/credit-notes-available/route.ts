import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get credit notes with remaining balance for this customer
    const creditNotes = await prisma.creditNote.findMany({
      where: {
        customerId: id,
        isActive: true,
        balanceAmount: { gt: 0 },
      },
      select: {
        id: true,
        creditNoteNumber: true,
        issueDate: true,
        totalAmount: true,
        balanceAmount: true,
        taxableAmount: true,
        igst: true,
        cgst: true,
        sgst: true,
        totalTax: true,
      },
      orderBy: { issueDate: "desc" },
    });

    return NextResponse.json({ creditNotes });
  } catch (error) {
    console.error("Error fetching credit notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit notes" },
      { status: 500 }
    );
  }
}
