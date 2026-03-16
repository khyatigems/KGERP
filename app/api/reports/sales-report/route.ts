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

  const [dailySales, weeklySales, monthlySales] = await Promise.all([
    prisma.sale.count({ where: { saleDate: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.sale.count({ where: { saleDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.sale.count({ where: { saleDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } })
  ]);
  return NextResponse.json({ dailySales, weeklySales, monthlySales });
}
