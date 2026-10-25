import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureInventoryQrPaymentSchema } from "@/lib/inventory-qr-payment-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    await ensureInventoryQrPaymentSchema();
    const { slug } = await params;
    const body = await request.json() as { attemptId?: string };
    const attemptId = String(body.attemptId || "");
    if (!attemptId || attemptId.length > 64) return NextResponse.json({ message: "Invalid checkout reference." }, { status: 400 });
    const attempt = await prisma.inventoryQrPaymentAttempt.findUnique({ where: { id: attemptId }, select: { id: true, inventoryId: true, authorizationId: true, status: true } });
    if (!attempt) return NextResponse.json({ success: true });
    const item = await prisma.inventory.findUnique({ where: { id: attempt.inventoryId }, select: { sku: true } });
    if (!item || item.sku !== slug) return NextResponse.json({ message: "Checkout does not match this product." }, { status: 404 });
    await prisma.inventoryQrPaymentAttempt.updateMany({
      where: { id: attempt.id, status: { not: "PAID" }, activeKey: attempt.authorizationId },
      data: { status: "CANCELLED", failureReason: "Customer closed checkout" },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "Could not update the checkout status." }, { status: 500 });
  }
}
