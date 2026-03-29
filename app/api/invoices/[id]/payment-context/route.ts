import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.INVOICE_MANAGE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureBillfreePhase1Schema();

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      totalAmount: true,
      paidAmount: true,
      sales: { take: 1, select: { customerId: true } },
      legacySale: { select: { customerId: true } },
      quotation: { select: { customerId: true } },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const customerId =
    invoice.sales?.[0]?.customerId ||
    invoice.legacySale?.customerId ||
    invoice.quotation?.customerId ||
    null;

  const couponRows = await prisma.$queryRawUnsafe<Array<{ code: string; discountAmount: number }>>(
    `SELECT c.code as code, COALESCE(r.discountAmount,0) as discountAmount
     FROM "CouponRedemption" r
     JOIN "Coupon" c ON c.id = r.couponId
     WHERE r.invoiceId = ?
     ORDER BY r.redeemedAt DESC
     LIMIT 1`,
    id
  ).catch(() => []);

  const lsRows = await prisma.$queryRawUnsafe<Array<{
    redeemRupeePerPoint: number;
    minRedeemPoints: number;
    maxRedeemPercent: number;
  }>>(
    `SELECT redeemRupeePerPoint, minRedeemPoints, maxRedeemPercent
     FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch(() => []);
  const ls = lsRows?.[0] || { redeemRupeePerPoint: 1, minRedeemPoints: 0, maxRedeemPercent: 30 };

  const pointsRows = customerId
    ? await prisma.$queryRawUnsafe<Array<{ points: number }>>(
        `SELECT COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
        customerId
      ).catch(() => [])
    : [];
  const availablePoints = Number(pointsRows?.[0]?.points || 0);
  const remaining = Math.max(0, Number(invoice.totalAmount || 0) - Number(invoice.paidAmount || 0));
  const maxByPercent = Math.max(0, (Number(invoice.totalAmount || 0) * Number(ls.maxRedeemPercent || 0)) / 100);
  const maxByPoints = availablePoints * Math.max(0.0001, Number(ls.redeemRupeePerPoint || 1));
  const loyaltyMaxRedeemAmount = Math.max(0, Math.min(remaining, maxByPercent, maxByPoints));

  return NextResponse.json({
    invoiceId: invoice.id,
    totalAmount: Number(invoice.totalAmount || 0),
    paidAmount: Number(invoice.paidAmount || 0),
    remaining,
    coupon: couponRows?.[0]
      ? { code: String(couponRows[0].code), discountAmount: Number(couponRows[0].discountAmount || 0) }
      : null,
    loyalty: {
      availablePoints,
      redeemRupeePerPoint: Number(ls.redeemRupeePerPoint || 1),
      minRedeemPoints: Number(ls.minRedeemPoints || 0),
      maxRedeemPercent: Number(ls.maxRedeemPercent || 0),
      loyaltyMaxRedeemAmount,
    },
  });
}

