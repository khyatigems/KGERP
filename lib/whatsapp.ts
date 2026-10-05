const WHATSAPP_BASE_URL = "https://wa.me/";

export function buildWhatsappUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `${WHATSAPP_BASE_URL}?text=${encoded}`;
}

export function normalizeWhatsAppPhone(input: string): string {
  const digits = String(input || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return digits;
}

export function buildCustomerWhatsappUrl(phone: string, message: string): string {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  return `${WHATSAPP_BASE_URL}${normalizedPhone}?text=${encodeURIComponent(message)}`;
}

export function buildQuotationWhatsappMessage(params: {
  quotationUrl: string;
  expiryDate: string; // formatted date string
}) {
  return [
    "Namaste 🙏",
    "",
    "Please find your quotation from KhyatiGems™:",
    params.quotationUrl,
    "",
    `Quotation valid till ${params.expiryDate}`,
  ].join("\n");
}

export function buildQuotationWhatsappLink(params: {
  quotationUrl: string;
  expiryDate: string;
}) {
  const msg = buildQuotationWhatsappMessage(params);
  return buildWhatsappUrl(msg);
}

export function buildInvoiceWhatsappMessage(params: {
  invoiceUrl: string;
  invoiceNumber: string;
  customerName?: string;
  purchaseDate?: string;
  orderNumber?: string | null;
}) {
  return [
    `Hi ${params.customerName || "there"},`,
    "",
    `Thank you for your purchase from KhyatiGems on ${params.purchaseDate || "the date of purchase"}.`,
    "",
    `Please find invoice ${params.invoiceNumber} attached. I have downloaded the invoice PDF; please attach it here before sending.`,
    params.orderNumber ? `Marketplace order reference: ${params.orderNumber}` : "",
    `Invoice link: ${params.invoiceUrl}`,
    "",
    "Thank you for choosing KhyatiGems.",
    "Warm regards,",
    "Team KhyatiGems",
  ].filter(Boolean).join("\n");
}

export function buildInvoiceWhatsappLink(params: {
    invoiceUrl: string;
    invoiceNumber: string;
}) {
    const msg = buildInvoiceWhatsappMessage(params);
    return buildWhatsappUrl(msg);
}
