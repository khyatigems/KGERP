import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logActivity } from "@/lib/activity-logger";
import { ensureBillfreePhase1Schema, prisma } from "@/lib/prisma";
import { buildCustomerWhatsappUrl, buildInvoiceWhatsappMessage } from "@/lib/whatsapp";
import { checkUserPermission, PERMISSIONS } from "@/lib/permissions";
import { getInvoiceOrderReference } from "@/lib/email/order-reference";
import { formatDate } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await checkUserPermission(session.user.id, PERMISSIONS.COMMUNICATION_MANAGE))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await ensureBillfreePhase1Schema();
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    select: {
      id: true,
      invoiceNumber: true,
      token: true,
      createdAt: true,
      sales: {
        take: 1,
        orderBy: { saleDate: "asc" },
        select: {
          saleDate: true,
          customer: { select: { id: true, name: true, phone: true, whatsappNumber: true } },
        },
      },
      legacySale: {
        select: {
          customer: { select: { id: true, name: true, phone: true, whatsappNumber: true } },
        },
      },
      quotation: {
        select: {
          customer: { select: { id: true, name: true, phone: true, whatsappNumber: true } },
        },
      },
    },
  });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

  const customer = invoice.sales[0]?.customer ?? invoice.legacySale?.customer ?? invoice.quotation?.customer;
  if (!customer) return NextResponse.json({ error: "No customer is linked to this invoice" }, { status: 422 });
  const phone = customer.whatsappNumber || customer.phone || "";
  if (!phone.replace(/\D/g, "")) return NextResponse.json({ error: "Customer has no WhatsApp number" }, { status: 422 });

  const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || new URL(_request.url).origin;
  const invoiceUrl = invoice.token ? `${baseUrl}/invoice/${invoice.token}` : `${baseUrl}/invoices/${invoice.id}`;
  const orderNumber = await getInvoiceOrderReference(invoice.id);
  const purchaseDate = formatDate(invoice.sales[0]?.saleDate || invoice.createdAt);
  const variables = {
    name: customer.name || "there",
    invoice: invoice.invoiceNumber,
    date: purchaseDate,
    order_number: orderNumber || "",
    order_number_line: orderNumber ? `Marketplace order reference: ${orderNumber}` : "",
    invoice_link: invoiceUrl,
    link: invoiceUrl,
  };
  const templateRows = await prisma.$queryRawUnsafe<Array<{ body: string }>>(
    `SELECT body FROM "MessageTemplate" WHERE key = 'sales_invoice' AND channel = 'WHATSAPP_WEB' AND isActive = 1 LIMIT 1`,
  );
  const template = templateRows[0]?.body;
  const oldDefault = [
    "Dear {name},",
    "",
    "Thank you for choosing KhyatiGems™. Your invoice {invoice} dated {date} is ready for your records.",
    "You can review it securely here: {invoice_link}",
    "If you have any questions or need assistance, simply reply to this message—our team is happy to help.",
    "",
    "Warm regards,",
    "Team KhyatiGems™",
  ].join("\n");
  const message = template && template !== oldDefault
    ? template.replace(/\{([a-z_]+)\}/gi, (match, key: string) => key in variables ? variables[key as keyof typeof variables] : match)
      .split(/\r?\n/)
      .filter((line) => line.trim() || template.includes("{order_number_line}"))
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
    : buildInvoiceWhatsappMessage({
        invoiceUrl,
        invoiceNumber: invoice.invoiceNumber,
        customerName: customer.name,
        purchaseDate,
        orderNumber,
      });
  const launchId = crypto.randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "CustomerCampaignLog" (id, customerId, invoiceId, eventType, channel, templateKey, payload, status, openedAt, launchedById, createdAt)
     VALUES (?, ?, ?, 'INVOICE', 'WHATSAPP_WEB', 'sales_invoice', ?, 'LAUNCHED', NULL, ?, CURRENT_TIMESTAMP)`,
    launchId,
    customer.id,
    invoice.id,
    JSON.stringify({ message, phone }),
    session.user.id,
  );
  await logActivity({
    entityType: "Invoice",
    actionType: "WHATSAPP_LAUNCHED",
    entityId: invoice.id,
    entityIdentifier: invoice.invoiceNumber,
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    module: "communication",
    action: "whatsapp.invoice.launch",
    referenceId: launchId,
    metadata: { customerId: customer.id, invoiceId: invoice.id, phone },
  });

  return NextResponse.json({
    whatsappUrl: buildCustomerWhatsappUrl(phone, message),
    communicationId: `whatsapp:${launchId}`,
  });
}
