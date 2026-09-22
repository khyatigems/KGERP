import { prisma } from "@/lib/prisma";
import { buildInvoiceData } from "@/lib/documents/invoice-data";
import { generateInvoicePdfBuffer } from "@/lib/documents/invoice-service";
import { fetchGciCertificatePdf } from "@/lib/gci/client";
import {
  sendInvoiceEmail,
  sendCertificateEmail,
  sendCertificateAndInvoiceEmail,
} from "@/lib/email/email-service";
import type { EmailAttachment } from "@/lib/email/types";

export interface SendOrderDocumentsResult {
  success: boolean;
  message: string;
  logId?: string;
  steps?: Array<{ label: string; ms: number }>;
}

interface OrderEmailContext {
  customerEmail: string;
  customerName: string;
  invoiceNumber: string;
  invoiceId: string;
  orderNumber: string | null;
  certificateNumber: string | null;
  gemstoneName: string | null;
  customerId: string | null;
}

async function loadContext(invoiceId: string): Promise<OrderEmailContext | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      sales: {
        include: { inventory: true, customer: true },
        orderBy: { saleDate: "asc" },
      },
      quotation: { include: { customer: true } },
    },
  });
  if (!invoice) return null;

  const first = invoice.sales[0];
  const customer = first?.customer ?? invoice.quotation?.customer ?? null;

  return {
    customerEmail: customer?.email ?? first?.customerEmail ?? "",
    customerName: customer?.name ?? first?.customerName ?? "Customer",
    invoiceNumber: invoice.invoiceNumber,
    invoiceId: invoice.id,
    orderNumber: first?.orderId ?? null,
    certificateNumber:
      first?.inventory?.certificateNumber ?? first?.inventory?.certificateNo ?? null,
    gemstoneName: first?.inventory?.itemName ?? null,
    customerId: customer?.id ?? first?.customerId ?? invoice.quotation?.customerId ?? null,
  };
}

/**
 * Centralized "order documents → email" flow. Generates the canonical invoice
 * PDF and/or retrieves the GCI A4 certificate, then emails them. Every send is
 * recorded in EmailLog for the communication timeline.
 */
export async function sendOrderDocumentsEmail(
  invoiceId: string,
  options: { includeInvoice: boolean; includeCertificate: boolean }
): Promise<SendOrderDocumentsResult> {
  const steps: Array<{ label: string; ms: number }> = [];
  const time = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = Date.now();
    try {
      return await fn();
    } finally {
      steps.push({ label, ms: Date.now() - start });
    }
  };

  const ctx = await time("Preparing email", () => loadContext(invoiceId));
  if (!ctx) return { success: false, message: "Invoice not found", steps };
  if (!ctx.customerEmail) {
    return { success: false, message: "No customer email address on this invoice", steps };
  }

  const attachments: EmailAttachment[] = [];

  if (options.includeInvoice) {
    const data = await time("Composing email", () => buildInvoiceData(invoiceId));
    if (!data) return { success: false, message: "Could not build invoice data", steps };
    const pdf = await time("Attaching invoice PDF", () => generateInvoicePdfBuffer(data));
    attachments.push({ fileName: pdf.fileName, mimeType: pdf.mimeType, content: pdf.buffer });
  }

  if (options.includeCertificate) {
    if (!ctx.certificateNumber) {
      return {
        success: false,
        message: "CERTIFICATE NOT AVAILABLE — this item has no certificate number",
        steps,
      };
    }
    let certPdf: Buffer | null = null;
    try {
      certPdf = await time("Attaching certificate", () =>
        fetchGciCertificatePdf(ctx.certificateNumber!)
      );
    } catch (error) {
      return {
        success: false,
        message: `CERTIFICATE NOT AVAILABLE — ${error instanceof Error ? error.message : "GCI retrieval failed"}`,
        steps,
      };
    }
    if (!certPdf) {
      return { success: false, message: "CERTIFICATE NOT AVAILABLE — A4 PDF unavailable in GCI", steps };
    }
    attachments.push({
      fileName: `Certificate_${ctx.certificateNumber}.pdf`,
      mimeType: "application/pdf",
      content: certPdf,
    });
  }

  if (attachments.length === 0) {
    return { success: false, message: "No documents selected to send", steps };
  }

  const base = {
    customerEmail: ctx.customerEmail,
    customerName: ctx.customerName,
    customerId: ctx.customerId,
    orderId: ctx.invoiceId,
  };

  let result;
  if (options.includeInvoice && options.includeCertificate && ctx.certificateNumber) {
    result = await time("Sending certificate + invoice", () =>
      sendCertificateAndInvoiceEmail({
        ...base,
        orderNumber: ctx.orderNumber ?? undefined,
        invoiceNumber: ctx.invoiceNumber,
        certificateNumber: ctx.certificateNumber!,
        gemstoneName: ctx.gemstoneName ?? undefined,
        invoiceAttachment: attachments[0],
        certificateAttachment: attachments[1],
      })
    );
  } else if (options.includeCertificate && ctx.certificateNumber) {
    result = await time("Sending certificate", () =>
      sendCertificateEmail({
        ...base,
        certificateNumber: ctx.certificateNumber!,
        gemstoneName: ctx.gemstoneName ?? undefined,
        certificateAttachment: attachments[0],
      })
    );
  } else {
    result = await time("Sending invoice", () =>
      sendInvoiceEmail({
        ...base,
        orderNumber: ctx.orderNumber ?? undefined,
        invoiceNumber: ctx.invoiceNumber,
        invoiceAttachment: attachments[0],
      })
    );
  }

  return result.success
    ? { success: true, message: "Email sent", logId: result.logId, steps }
    : { success: false, message: result.error ?? "Email failed", logId: result.logId, steps };
}

/**
 * Email a single sold item's GCI certificate directly from the inventory page.
 * Resolves the customer from the item's Sale and retrieves the A4 cert from GCI.
 */
export async function sendCertificateEmailForInventory(
  inventoryId: string
): Promise<SendOrderDocumentsResult> {
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      sales: {
        include: { customer: true },
        orderBy: { saleDate: "desc" },
        take: 1,
      },
    },
  });
  if (!inventory) return { success: false, message: "Inventory item not found" };

  const sale = inventory.sales[0];
  if (!sale) return { success: false, message: "Item has not been sold yet" };

  const customerEmail = sale.customer?.email ?? sale.customerEmail ?? "";
  if (!customerEmail) return { success: false, message: "No customer email on the sale" };

  const customerName = sale.customer?.name ?? sale.customerName ?? "Customer";
  const certificateNumber = inventory.certificateNumber ?? inventory.certificateNo ?? null;
  if (!certificateNumber) {
    return { success: false, message: "CERTIFICATE NOT AVAILABLE — no certificate number on this item" };
  }

  let certPdf: Buffer | null = null;
  try {
    certPdf = await fetchGciCertificatePdf(certificateNumber);
  } catch (error) {
    return {
      success: false,
      message: `CERTIFICATE NOT AVAILABLE — ${error instanceof Error ? error.message : "GCI retrieval failed"}`,
    };
  }
  if (!certPdf) {
    return { success: false, message: "CERTIFICATE NOT AVAILABLE — A4 PDF unavailable in GCI" };
  }

  const result = await sendCertificateEmail({
    customerEmail,
    customerName,
    certificateNumber,
    gemstoneName: inventory.itemName ?? undefined,
    customerId: sale.customerId ?? null,
    orderId: sale.invoiceId ?? null,
    certificateAttachment: {
      fileName: `Certificate_${certificateNumber}.pdf`,
      mimeType: "application/pdf",
      content: certPdf,
    },
  });

  return result.success
    ? { success: true, message: "Certificate emailed", logId: result.logId }
    : { success: false, message: result.error ?? "Email failed", logId: result.logId };
}
