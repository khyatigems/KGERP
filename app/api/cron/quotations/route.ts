import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const inTwoDays = new Date();
  inTwoDays.setDate(inTwoDays.getDate() + 2);

  try {
    const candidates = await prisma.quotation.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          gte: now,
          lte: inTwoDays,
        },
      },
      select: {
        id: true,
      },
    });

    const processed: string[] = [];

    for (const quote of candidates) {
      const alreadySent = await prisma.activityLog.findFirst({
        where: {
          entityId: quote.id,
          actionType: "REMINDER_SENT",
        },
      });

      if (alreadySent) {
        continue;
      }

      await prisma.activityLog.create({
        data: {
          entityType: "Quotation",
          entityId: quote.id,
          actionType: "REMINDER_SENT",
          source: "SYSTEM_CRON"
        },
      });

      processed.push(quote.id);
    }

    return NextResponse.json({
      processedCount: processed.length,
      processedIds: processed,
    });
  } catch (error) {
    console.error("Cron quotations error", error);
    return NextResponse.json(
      { error: "Failed to process quotation reminders" },
      { status: 500 }
    );
  }
}

