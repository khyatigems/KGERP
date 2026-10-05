import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { normalizeWhatsAppPhone, buildCustomerWhatsappUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url), 303);
  if (!hasPermission(session.user.role, PERMISSIONS.CUSTOMER_VIEW)) {
    return NextResponse.redirect(new URL("/", req.url), 303);
  }

  await ensureBillfreePhase1Schema();

  const formData = await req.formData();
  const customerId = String(formData.get("customerId") || "").trim();
  const eventTypeValue = String(formData.get("eventType") || "GENERAL").trim().toUpperCase();
  const eventType = ["BIRTHDAY", "ANNIVERSARY", "GENERAL"].includes(eventTypeValue)
    ? eventTypeValue
    : "GENERAL";
  if (!customerId) return NextResponse.redirect(new URL("/customers/events", req.url), 303);

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, whatsappNumber: true },
  });
  if (!customer) return NextResponse.redirect(new URL("/customers/events", req.url), 303);

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

  const phone = normalizeWhatsAppPhone(customer.whatsappNumber || customer.phone || "");
  if (!phone) return NextResponse.redirect(new URL("/customers/events?error=no-phone", req.url), 303);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "CustomerCampaignLog" (id, customerId, eventType, channel, templateKey, payload, status, openedAt, launchedById, createdAt)
     VALUES (?, ?, ?, 'WHATSAPP_WEB', ?, ?, 'LAUNCHED', NULL, ?, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    customer.id,
    eventType,
    templateKey,
    JSON.stringify({ message: body, phone }),
    session.user.id
  );

  await logActivity({
    entityType: "Customer",
    actionType: "WHATSAPP_LAUNCHED",
    entityId: customer.id,
    entityIdentifier: customer.id,
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    module: "communication",
    action: "whatsapp.launch",
    referenceId: customer.id,
    metadata: {
        eventType,
        templateKey,
        messageBody: body,
        phone,
    },
  });

  const waUrl = buildCustomerWhatsappUrl(phone, body);
  return NextResponse.redirect(waUrl, 303);
}
