import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const grouped = await prisma.payment.groupBy({
    by: ["method"],
    _sum: { amount: true },
    _count: { id: true }
  });

  const data = grouped.map((row) => ({
    method: row.method,
    transactionCount: row._count.id,
    totalAmount: row._sum.amount || 0
  }));

  return NextResponse.json({ data });
}
