import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  await ensureBillfreePhase1Schema();
  const { token } = await context.params;
  const body = await req.json().catch(() => ({}));
  const dateOfBirth = typeof body?.dateOfBirth === "string" ? body.dateOfBirth : "";
  const anniversaryDate = typeof body?.anniversaryDate === "string" ? body.anniversaryDate : "";
  if (!dateOfBirth && !anniversaryDate) {
    return NextResponse.json({ error: "DOB or Anniversary is required" }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { token },
    include: { sales: true, quotation: true, legacySale: true },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const customerId =
    invoice.sales?.find((s) => !!s.customerId)?.customerId ||
    invoice.legacySale?.customerId ||
    invoice.quotation?.customerId ||
    null;
  if (!customerId) return NextResponse.json({ error: "Customer not linked" }, { status: 400 });

  const existing = await prisma.$queryRawUnsafe<Array<{
    dateOfBirth: string | null;
    anniversaryDate: string | null;
    communicationOptIn: number | null;
    preferredLanguage: string | null;
  }>>(
    `SELECT dateOfBirth, anniversaryDate, communicationOptIn, preferredLanguage
     FROM "CustomerProfileExtra" WHERE customerId = ? LIMIT 1`,
    customerId
  ).catch(() => []);
  const old = existing?.[0];

  const newDob = old?.dateOfBirth || (dateOfBirth ? new Date(dateOfBirth).toISOString() : null);
  const newAnn = old?.anniversaryDate || (anniversaryDate ? new Date(anniversaryDate).toISOString() : null);

  await prisma.$executeRawUnsafe(
    `INSERT OR REPLACE INTO "CustomerProfileExtra"
      (customerId, dateOfBirth, anniversaryDate, communicationOptIn, preferredLanguage, updatedAt)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    customerId,
    newDob,
    newAnn,
    old?.communicationOptIn == null ? 1 : old.communicationOptIn,
    old?.preferredLanguage || null
  );

  const settings = await prisma.$queryRawUnsafe<Array<{
    dobProfilePoints: number;
    anniversaryProfilePoints: number;
    redeemRupeePerPoint: number;
  }>>(
    `SELECT dobProfilePoints, anniversaryProfilePoints, redeemRupeePerPoint
     FROM "LoyaltySettings" WHERE id = 'default' LIMIT 1`
  ).catch(() => []);
  const cfg = settings?.[0] || { dobProfilePoints: 0, anniversaryProfilePoints: 0, redeemRupeePerPoint: 1 };

  const dobJustAdded = !old?.dateOfBirth && !!dateOfBirth;
  const annJustAdded = !old?.anniversaryDate && !!anniversaryDate;
  const awardedPoints =
    (dobJustAdded ? Number(cfg.dobProfilePoints || 0) : 0) +
    (annJustAdded ? Number(cfg.anniversaryProfilePoints || 0) : 0);

  if (awardedPoints <= 0) {
    return NextResponse.json({ success: true, awardedPoints: 0 });
  }

  const rupeePerPoint = Math.max(0.0001, Number(cfg.redeemRupeePerPoint || 1));
  const rupeeValue = awardedPoints * rupeePerPoint;
  await prisma.$executeRawUnsafe(
    `INSERT INTO "LoyaltyLedger" (id, customerId, invoiceId, type, points, rupeeValue, remarks, createdAt)
     VALUES (?, ?, ?, 'EARN', ?, ?, ?, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    customerId,
    invoice.id,
    awardedPoints,
    rupeeValue,
    "Profile completion reward points"
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "CustomerCampaignLog" (id, customerId, eventType, channel, templateKey, payload, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    crypto.randomUUID(),
    customerId,
    "PROFILE_COMPLETION_REWARD",
    "INVOICE_WEB",
    "profile_reward_points",
    JSON.stringify({ awardedPoints, rupeeValue }),
    "LOYALTY_POINTS_AWARDED"
  );

  return NextResponse.json({ success: true, awardedPoints, rupeeValue });
}
