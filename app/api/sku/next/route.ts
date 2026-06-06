import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT value FROM "Setting" WHERE key = 'GLOBAL_SKU_SEQUENCE' LIMIT 1`
    );
    const currentValue = rows.length > 0 ? Number(rows[0].value) : 0;
    const nextSequence = Number.isFinite(currentValue) ? currentValue + 1 : 1;
    return NextResponse.json({ nextSequence });
  } catch (error) {
    console.error("[/api/sku/next] Error:", error);
    return NextResponse.json({ nextSequence: 1 });
  }
}
