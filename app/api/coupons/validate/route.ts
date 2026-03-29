import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.user.role, PERMISSIONS.SALES_VIEW)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await ensureBillfreePhase1Schema();

  const body = await req.json().catch(() => ({}));
  const code = String(body?.code || "").trim().toUpperCase();
  const customerId = String(body?.customerId || "").trim() || null;
  const invoiceTotal = Math.max(0, Number(body?.invoiceTotal || 0));
  if (!code) return NextResponse.json({ valid: false, message: "Coupon code required" }, { status: 400 });

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    type: string;
    value: number;
    maxDiscount: number | null;
    minInvoiceAmount: number | null;
    validFrom: string | null;
    validTo: string | null;
    usageLimitTotal: number | null;
    usageLimitPerCustomer: number | null;
    applicableScope: string;
    isActive: number;
  }>>(
    `SELECT id, type, value, maxDiscount, minInvoiceAmount, validFrom, validTo, usageLimitTotal, usageLimitPerCustomer, applicableScope, isActive
     FROM "Coupon" WHERE code = ? LIMIT 1`,
    code
  ).catch(() => []);
  const c = rows?.[0];
  if (!c || Number(c.isActive || 0) !== 1) return NextResponse.json({ valid: false, message: "Invalid or inactive coupon" });
  const now = Date.now();
  if (c.validFrom && new Date(c.validFrom).getTime() > now) return NextResponse.json({ valid: false, message: "Coupon not active yet" });
  if (c.validTo && new Date(c.validTo).getTime() < now) return NextResponse.json({ valid: false, message: "Coupon expired" });
  if (c.minInvoiceAmount != null && invoiceTotal + 0.009 < Number(c.minInvoiceAmount || 0)) {
    return NextResponse.json({ valid: false, message: "Invoice total below minimum amount for this coupon" });
  }
  const scope = String(c.applicableScope || "all");
  if (scope.startsWith("customer:")) {
    const target = scope.split(":")[1] || "";
    if (!customerId || customerId !== target) {
      return NextResponse.json({ valid: false, message: "Coupon is not assigned to this customer" });
    }
  }
  const totalUse = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
    `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ?`,
    c.id
  ).catch(() => []);
  if (c.usageLimitTotal != null && Number(totalUse?.[0]?.cnt || 0) >= Number(c.usageLimitTotal || 0)) {
    return NextResponse.json({ valid: false, message: "Coupon usage limit reached" });
  }
  if (customerId && c.usageLimitPerCustomer != null) {
    const custUse = await prisma.$queryRawUnsafe<Array<{ cnt: number }>>(
      `SELECT COUNT(1) as cnt FROM "CouponRedemption" WHERE couponId = ? AND customerId = ?`,
      c.id,
      customerId
    ).catch(() => []);
    if (Number(custUse?.[0]?.cnt || 0) >= Number(c.usageLimitPerCustomer || 0)) {
      return NextResponse.json({ valid: false, message: "Coupon per-customer limit reached" });
    }
  }

  let discountAmount = c.type === "PERCENT" ? (invoiceTotal * Number(c.value || 0)) / 100 : Number(c.value || 0);
  if (c.maxDiscount != null) discountAmount = Math.min(discountAmount, Number(c.maxDiscount || 0));
  discountAmount = Math.max(0, Math.min(discountAmount, invoiceTotal));

  return NextResponse.json({
    valid: true,
    discountAmount,
    finalPayable: Math.max(0, invoiceTotal - discountAmount),
    message: "Coupon validated",
  });
}

