import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await ensureBillfreePhase1Schema();
  const { id } = await params;
  const invoiceTotal = Math.max(0, Number(req.nextUrl.searchParams.get("invoiceTotal") || 0));

  const pointsRows = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
    `SELECT COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
    id
  ).catch(() => []);
  const settingsRows = await prisma.$queryRawUnsafe<Array<{
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
  }>>(
    `SELECT redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch(() => []);

  const availablePoints = Number(pointsRows?.[0]?.points || 0);
  const s = settingsRows?.[0] || { redeemRupeePerPoint: 1, minRedeemPoints: 0, maxRedeemPercent: 30 };
  const redeemRupeePerPoint = Math.max(0.0001, Number(s.redeemRupeePerPoint || 1));
  const maxRedeemPercent = Math.max(0, Math.min(100, Number(s.maxRedeemPercent || 30)));
  const maxByPoints = availablePoints * redeemRupeePerPoint;
  const maxByPercent = (invoiceTotal * maxRedeemPercent) / 100;
  const maxRedeemAmount = Math.max(0, Math.min(maxByPoints, maxByPercent, invoiceTotal));

  return NextResponse.json({
    availablePoints,
    redeemRupeePerPoint,
    minRedeemPoints: Number(s.minRedeemPoints || 0),
    maxRedeemPercent,
    maxRedeemAmount,
  });
}

