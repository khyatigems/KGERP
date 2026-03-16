import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.REPORTS_VIEW)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [inStockItems, totalCost, totalSell] = await Promise.all([
    prisma.inventory.count({ where: { status: "IN_STOCK" } }),
    prisma.inventory.aggregate({ _sum: { costPrice: true }, where: { status: "IN_STOCK" } }),
    prisma.inventory.aggregate({ _sum: { sellingPrice: true }, where: { status: "IN_STOCK" } })
  ]);
  return NextResponse.json({
    inStockItems,
    totalCost: totalCost._sum.costPrice || 0,
    totalSell: totalSell._sum.sellingPrice || 0
  });
}
