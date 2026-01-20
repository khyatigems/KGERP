const WHATSAPP_BASE_URL = "https://wa.me/";

export function buildWhatsappUrl(message: string) {
  const encoded = encodeURIComponent(message);
  return `${WHATSAPP_BASE_URL}?text=${encoded}`;
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
}) {
    return [
        "Namaste 🙏",
        "",
        `Please find your invoice ${params.invoiceNumber} from KhyatiGems™:`,
        params.invoiceUrl,
        "",
        "Thank you for your business!"
    ].join("\n");
}

export function buildInvoiceWhatsappLink(params: {
    invoiceUrl: string;
    invoiceNumber: string;
}) {
    const msg = buildInvoiceWhatsappMessage(params);
    return buildWhatsappUrl(msg);
}
