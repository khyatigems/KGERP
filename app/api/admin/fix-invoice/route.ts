import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Force dynamic to ensure fresh database connection
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { invoiceNumber, totalAmount } = await req.json();
    
    if (!invoiceNumber || totalAmount === undefined) {
      return NextResponse.json({ error: "Missing invoiceNumber or totalAmount" }, { status: 400 });
    }
    
    const invoice = await prisma.invoice.update({
      where: { invoiceNumber },
      data: { totalAmount }
    });
    
    return NextResponse.json({ 
      success: true, 
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount
      }
    });
  } catch (error) {
    console.error("Fix invoice error:", error);
    return NextResponse.json({ 
      error: "Failed to fix invoice", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
