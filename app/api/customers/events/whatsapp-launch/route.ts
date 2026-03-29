import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  await ensureBillfreePhase1Schema();

  const customerId = req.nextUrl.searchParams.get("customerId") || "";
  const eventType = req.nextUrl.searchParams.get("eventType") || "GENERAL";
  if (!customerId) return NextResponse.redirect(new URL("/customers/events", req.url));

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, whatsappNumber: true },
  });
  if (!customer) return NextResponse.redirect(new URL("/customers/events", req.url));

  const templateKey = eventType === "BIRTHDAY" ? "birthday_wish" : eventType === "ANNIVERSARY" ? "anniversary_wish" : "general_wish";
  const tmplRows = await prisma.$queryRawUnsafe<Array<{ body: string }>>(
    `SELECT body FROM "MessageTemplate" WHERE key = ? AND isActive = 1 LIMIT 1`,
    templateKey
  ).catch(() => []);
  let body =
    tmplRows?.[0]?.body ||
    (eventType === "BIRTHDAY"
      ? "Happy Birthday {name}! Wishing you joy and prosperity."
      : eventType === "ANNIVERSARY"
      ? "Happy Anniversary {name}! Wishing you happiness and blessings."
      : "Hello {name}, thank you for being a valued customer.");

  const pointsRows = await prisma.$queryRawUnsafe<Array<{ points: number }>>(
    `SELECT COALESCE(SUM(points),0) as points FROM "LoyaltyLedger" WHERE customerId = ?`,
    customer.id
  ).catch(() => []);
  const points = Number(pointsRows?.[0]?.points || 0);

  const couponRows = await prisma.$queryRawUnsafe<Array<{ code: string }>>(
    `SELECT code FROM "Coupon"
     WHERE isActive = 1 AND applicableScope = ?
     ORDER BY createdAt DESC LIMIT 1`,
    `customer:${customer.id}`
  ).catch(() => []);
  const couponCode = couponRows?.[0]?.code || "";

  body = body
    .replaceAll("{name}", customer.name || "Customer")
    .replaceAll("{points}", String(points.toFixed(2)))
    .replaceAll("{coupon}", couponCode);

  const phone = normalizePhone(customer.whatsappNumber || customer.phone || "");
  if (!phone) return NextResponse.redirect(new URL("/customers/events?error=no-phone", req.url));

  await prisma.$executeRawUnsafe(
    `INSERT INTO "CustomerCampaignLog" (id, customerId, eventType, channel, templateKey, payload, status, openedAt, createdAt)
     VALUES (?, ?, ?, 'WHATSAPP_WEB', ?, ?, 'OPENED_IN_WHATSAPP', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    customer.id,
    eventType,
    templateKey,
    JSON.stringify({ message: body, phone })
  ).catch(() => {});

  await prisma.activityLog.create({
    data: {
      entityType: 'CUSTOMER',
      actionType: 'WHATSAPP_SENT',
      entityIdentifier: customer.id,
      userId: session.user.id,
      userName: session.user.name,
      details: JSON.stringify({
        eventType,
        templateKey,
        messageBody: body,
        phone,
      }),
    },
  }).catch(() => {});

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
  return NextResponse.redirect(waUrl);
}
