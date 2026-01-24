import { prisma } from "../lib/prisma";
import { buildQuotationWhatsappLink } from "../lib/whatsapp";

async function handleQuotationExpiryAndReminders() {
  const now = new Date();

  // 1) Mark expired quotations
  const expired = await prisma.quotation.updateMany({
    where: {
      expiryDate: { lt: now },
      status: "ACTIVE",
    },
    data: {
      status: "EXPIRED",
    },
  });
  
  console.log(`Expired ${expired.count} quotations.`);

  // 2) Send reminders
  // Find quotations expiring in next 24h
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const toRemind = await prisma.quotation.findMany({
    where: {
      status: "ACTIVE",
      expiryDate: { gte: now, lte: in24h },
      customerMobile: { not: null }, 
    },
    select: {
      id: true,
      quotationNumber: true,
      token: true,
      expiryDate: true,
      customerMobile: true,
    },
  });

  for (const q of toRemind) {
    // Check if already reminded in the last 24 hours
    const reminderSent = await prisma.activityLog.findFirst({
        where: {
            entityId: q.id,
            actionType: "REMINDER_SENT",
            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } 
        }
    });

    if (reminderSent) continue;

    const quotationUrl = `${process.env.APP_BASE_URL}/quote/${q.token}`;
    const expiryDateStr = q.expiryDate ? q.expiryDate.toISOString().slice(0, 10) : "";

    const waLink = buildQuotationWhatsappLink({
      quotationUrl,
      expiryDate: expiryDateStr,
    });

    console.log(`[REMINDER] Sending reminder for Quotation ${q.quotationNumber} to ${q.customerMobile}`);
    console.log(`[LINK] ${waLink}`);

    // Record event
    await prisma.activityLog.create({
      data: {
        entityType: "Quotation",
        entityId: q.id,
        actionType: "REMINDER_SENT",
        source: "SYSTEM_CRON",
        details: `Reminder for ${q.quotationNumber}`
      },
    });
  }
}

handleQuotationExpiryAndReminders()
  .catch((e) => {
    console.error("CRON_QUOTATION_EXPIRY error", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
