import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { sanitizeNumberText } from "@/lib/number-formatting";
import QRCode from "qrcode";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  documentTitle?: string;
  documentRightTag?: string;
  documentNumberLabel?: string;
  documentDateLabel?: string;
  documentSecondLine?: {
    leftLabel: string;
    leftValue: string;
    rightLabel: string;
    rightValue: string;
  };
  showPaymentSection?: boolean;
  showBankDetailsSection?: boolean;
  totalLabel?: string;
  extraTotalRows?: Array<{ label: string; amount: number; emphasis?: "bold" | "normal" }>;
  // Export invoice fields
  invoiceType?: "TAX_INVOICE" | "EXPORT_INVOICE";
  iecCode?: string;
  exportType?: "LUT" | "BOND" | "PAYMENT";
  countryOfDestination?: string;
  portOfDispatch?: string;
  modeOfTransport?: "AIR" | "COURIER" | "HAND_DELIVERY";
  courierPartner?: string;
  trackingId?: string;
  platformOrderId?: string;
  invoiceCurrency?: "INR" | "USD" | "EUR" | "GBP";
  conversionRate?: number;
  totalInrValue?: number;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
    website?: string;
    logoUrl?: string;
  };
  platformInfo?: {
    logoUrl?: string;
    label: string;
  };
  customer: {
    name: string;
    customerCode?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  items: {
    sku: string;
    hsn?: string;
    description: string;
    quantity: number;
    displayQty?: string;
    unitPrice: number; // Base Price (INR)
    usdPrice?: number; // USD price for export invoices
    basePrice?: number;
    gstRate?: number;
    gstAmount?: number;
    total: number;
    discountAmount?: number;
    certificateUrl?: string; // URL for certificate QR code
  }[];
  grossTotal?: number;
  subtotal: number;
  discount: number;
  tax: number;
  shippingCharge?: number;
  additionalCharge?: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  paidAt?: Date;
  paymentBreakdown?: Array<{
    method: string;
    amount: number;
  }>;
  terms?: string;
  exportTerms?: string; // Separate terms for export invoices
  notes?: string;
  signatureUrl?: string;
  publicUrl?: string;
  token?: string;
  upiQrData?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    holder: string;
    swiftCode?: string;
  };
}

const loadImageMeta = (url: string): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const dataUrl = canvas.toDataURL("image/png");
        resolve({ dataUrl, width: img.width, height: img.height });
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
};

const formatCurrencyPDF = (amount: number | undefined | null) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
  try {
    const fmt = new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return sanitizeNumberText(`₹${fmt.format(amount)}`);
  } catch {
    return sanitizeNumberText(`₹${Number(amount).toFixed(2)}`);
  }
};

const FONTS: Record<string, { normal: string; bold: string; italic?: string; bolditalic?: string }> = {
  notosansdisplay: {
    normal: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
    bold: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
    italic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf",
    bolditalic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf",
  },
  poppins: {
    normal: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf",
    italic: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Italic.ttf",
    bolditalic: "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-BoldItalic.ttf",
  },
};

type CachedFontData = { normal?: string; bold?: string; italic?: string; bolditalic?: string };
const cachedFontData = new Map<string, CachedFontData>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return binary;
}

async function loadFont(doc: jsPDF, family: string): Promise<boolean> {
  const fontDef = FONTS[family];
  if (!fontDef) return false;

  let cached = cachedFontData.get(family);
  if (!cached) {
    const promises = [
      fetch(fontDef.normal).then((r) => (r.ok ? r.arrayBuffer() : null)),
      fetch(fontDef.bold).then((r) => (r.ok ? r.arrayBuffer() : null)),
    ];
    if (fontDef.italic) promises.push(fetch(fontDef.italic).then((r) => (r.ok ? r.arrayBuffer() : null)));
    if (fontDef.bolditalic) promises.push(fetch(fontDef.bolditalic).then((r) => (r.ok ? r.arrayBuffer() : null)));

    const [normBuf, boldBuf, italicBuf, boldItalicBuf] = await Promise.all(promises);
    cached = {
      normal: normBuf ? arrayBufferToBinaryString(normBuf) : undefined,
      bold: boldBuf ? arrayBufferToBinaryString(boldBuf) : undefined,
      italic: italicBuf ? arrayBufferToBinaryString(italicBuf) : undefined,
      bolditalic: boldItalicBuf ? arrayBufferToBinaryString(boldItalicBuf) : undefined,
    };
  }

  const hasAnyFont = Boolean(cached.normal || cached.bold || cached.italic || cached.bolditalic);
  if (!hasAnyFont) return false;

  // Only cache successful loads so transient network failures don't get stuck permanently.
  if (!cachedFontData.has(family)) {
    cachedFontData.set(family, cached);
  }

  if (cached.normal) {
    doc.addFileToVFS(`${family}-Regular.ttf`, cached.normal);
    doc.addFont(`${family}-Regular.ttf`, family, "normal");
  }
  if (cached.bold) {
    doc.addFileToVFS(`${family}-Bold.ttf`, cached.bold);
    doc.addFont(`${family}-Bold.ttf`, family, "bold");
  }
  if (cached.italic && fontDef.italic) {
    doc.addFileToVFS(`${family}-Italic.ttf`, cached.italic);
    doc.addFont(`${family}-Italic.ttf`, family, "italic");
  }
  if (cached.bolditalic && fontDef.bolditalic) {
    doc.addFileToVFS(`${family}-BoldItalic.ttf`, cached.bolditalic);
    doc.addFont(`${family}-BoldItalic.ttf`, family, "bolditalic");
  }

  return true;
}

function convertNumberToWords(amount: number, currency: string = "INR"): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertToWords = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertToWords(n % 100) : "");
    if (n < 100000) return convertToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertToWords(n % 1000) : "");
    if (n < 10000000) return convertToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convertToWords(n % 100000) : "");
    return convertToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convertToWords(n % 10000000) : "");
  };

  const [whole, decimal] = amount.toFixed(2).split(".");
  const wholeInt = parseInt(whole);
  const decimalInt = parseInt(decimal);
  
  // Use appropriate currency names
  const mainUnit = currency === "USD" ? "Dollars" : currency === "EUR" ? "Euros" : "Rupees";
  const subUnit = currency === "USD" ? "Cents" : currency === "EUR" ? "Cents" : "Paise";

  let words = wholeInt === 0 ? `Zero ${mainUnit}` : convertToWords(wholeInt) + ` ${mainUnit}`;
  if (decimalInt > 0) {
    words += " and " + convertToWords(decimalInt) + ` ${subUnit}`;
  }
  return words + " Only";
}

function normalizeAddressText(input: string) {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  await loadFont(doc, "notosansdisplay");
  let fontFamily = "poppins";
  const poppinsLoaded = await loadFont(doc, "poppins");
  if (!poppinsLoaded) {
    // Fallback to built-in font if remote font fails to load
    fontFamily = "helvetica";
  }
  const numberFont = "notosansdisplay";
  doc.setCharSpace(0);

  const writeAmountRight = (text: string, x: number, y: number, opts?: { bold?: boolean; fontSize?: number }) => {
    const prevFont = doc.getFont().fontName;
    const prevStyle = doc.getFont().fontStyle;
    const prevSize = doc.getFontSize();
    doc.setFont(numberFont, opts?.bold ? "bold" : "normal");
    if (opts?.fontSize) doc.setFontSize(opts.fontSize);
    doc.text(text, x, y, { align: "right" });
    doc.setFont(prevFont, prevStyle);
    doc.setFontSize(prevSize);
  };

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 11;
  let y = margin;

  const blue = [37, 99, 235] as [number, number, number];
  const gray = [120, 120, 120] as [number, number, number];
  const lightGray = [220, 220, 220] as [number, number, number];

  let logoDataUrl: string | null = null;
  let logoW = 0;
  let logoH = 0;
  let signatureDataUrl: string | null = null;
  let sigW = 0;
  let sigH = 0;

  if (data.company.logoUrl) {
    try {
      const res = await loadImageMeta(data.company.logoUrl);
      logoDataUrl = res.dataUrl;
      logoW = res.width;
      logoH = res.height;
    } catch {}
  }

  if (data.signatureUrl) {
    try {
      const res = await loadImageMeta(data.signatureUrl);
      signatureDataUrl = res.dataUrl;
      sigW = res.width;
      sigH = res.height;
    } catch {}
  }

  const panFromGstin = data.company.gstin && data.company.gstin.length >= 12
    ? data.company.gstin.substring(2, 12)
    : "";

  const logoBoxW = 30;
  const logoBoxH = 20;
  const logoRender = (() => {
    if (!logoDataUrl) return null;
    const scale = Math.min(logoBoxW / (logoW || logoBoxW), logoBoxH / (logoH || logoBoxH));
    const w = (logoW || logoBoxW) * scale;
    const h = (logoH || logoBoxH) * scale;
    const x = pageWidth - margin - w;
    const y = margin + 4;
    return { x, y, w, h };
  })();

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...blue);
  // Set document title based on invoice type
  const documentTitle = data.invoiceType === "EXPORT_INVOICE" ? "EXPORT INVOICE" : (data.documentTitle || "TAX INVOICE");
  doc.text(documentTitle, margin, y);
  doc.setFontSize(7.2);
  doc.setTextColor(0);
  if (logoRender) {
    doc.text(data.documentRightTag || "ORIGINAL FOR RECIPIENT", logoRender.x + logoRender.w / 2, logoRender.y - 2.4, { align: "center" });
  } else {
    doc.text(data.documentRightTag || "ORIGINAL FOR RECIPIENT", pageWidth - margin, y, { align: "right" });
  }
  y += 5.5;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(0);
  doc.text(data.company.name, margin, y);

  if (logoRender && logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", logoRender.x, logoRender.y, logoRender.w, logoRender.h, undefined, "FAST");
  }

  y += 3.5;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  const gstLine = data.company.gstin ? `GSTIN ${data.company.gstin}` : "";
  const panLine = panFromGstin ? `PAN ${panFromGstin}` : "";
  const iecLine = data.iecCode ? `IEC ${data.iecCode}` : "";
  const companyInfo = [gstLine, panLine, iecLine].filter(Boolean).join("   ");
  doc.text(companyInfo, margin, y);

  y += 4.5;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.8);
  doc.text(data.company.phone ? `Mobile: ${data.company.phone}` : "", margin, y);

  if (data.company.email) {
    doc.text(`Email: ${data.company.email}`, margin + 58, y);
  }
  if (data.company.website) {
    doc.text(`Website: ${data.company.website}`, margin, y + 3.8);
    y += 7.2;
  } else {
    y += 4.6;
  }

  // Add export details section for export invoices
  if (data.invoiceType === "EXPORT_INVOICE") {
    y += 2;
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
    
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.setTextColor(...blue);
    doc.text("Export Details:", margin, y);
    y += 4;

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(0);

    // Export details - compact single line format to save space
    const detailsParts = [
      data.countryOfDestination ? `Country: ${data.countryOfDestination}` : "",
      data.portOfDispatch ? `Port: ${data.portOfDispatch}` : "",
      data.exportType ? `Type: ${data.exportType}` : "",
      data.modeOfTransport ? `Transport: ${data.modeOfTransport}` : "",
      data.courierPartner ? `Courier: ${data.courierPartner}` : "",
      data.trackingId ? `Tracking: ${data.trackingId}` : ""
    ].filter(Boolean);
    
    if (detailsParts.length > 0) {
      doc.text(detailsParts.join("  |  "), margin, y);
      y += 3.5;
    }

    // Platform Order ID - Highlighted in a box for visibility
    if (data.platformOrderId) {
      const orderIdText = `Platform Order ID: ${data.platformOrderId}`;
      const textWidth = doc.getTextWidth(orderIdText);
      const boxPadding = 2;

      // Draw light blue background box
      doc.setFillColor(230, 240, 255);
      doc.rect(margin, y - 2, textWidth + (boxPadding * 2), 6, "F");

      // Draw border
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.3);
      doc.rect(margin, y - 2, textWidth + (boxPadding * 2), 6, "S");

      // Draw text
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(orderIdText, margin + boxPadding, y + 1.5);

      // Reset font
      doc.setFont(fontFamily, "normal");
      doc.setTextColor(0);
      // Box height is 6, add proper spacing after
      y += 8;
    }

    // Add zero rated supply notice
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(7);
    doc.setTextColor(0, 100, 0);
    doc.text("Zero Rated Supply: CGST = 0, SGST = 0, IGST = 0", margin, y);
    y += 3;
    doc.text("Supply meant for export under LUT without payment of IGST", margin, y);
    y += 5;
    
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7.8);
    doc.setTextColor(0);
    
    doc.setDrawColor(...blue);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 3;
  }

  // Add platform branding (small logo without replacing company logo)
  if (data.platformInfo?.logoUrl) {
    try {
      const platformRes = await loadImageMeta(data.platformInfo.logoUrl);
      const platformLogoW = 22;
      const platformLogoH = 12;
      const platformX = pageWidth - margin - platformLogoW;
      const platformY = y + 2;

      doc.addImage(platformRes.dataUrl, "PNG", platformX, platformY, platformLogoW, platformLogoH, undefined, "FAST");

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(110);
      doc.text("Sold via", platformX - 4, platformY + platformLogoH / 2 + 1, { align: "right" });

      if (data.platformInfo.label) {
        doc.setFont(fontFamily, "bold");
        doc.setTextColor(0);
        doc.text(data.platformInfo.label, platformX + platformLogoW / 2, platformY + platformLogoH + 5, { align: "center" });
      }

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(0);
      y += platformLogoH + 8; // Add space reserved for platform branding block
    } catch (error) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(0);
    }
  }

  const invoiceMetaY = y;
  doc.setFont(fontFamily, "bold");
  doc.text(`${data.documentNumberLabel || "Invoice #"}: ${data.invoiceNumber}`, margin, invoiceMetaY);
  doc.text(`${data.documentDateLabel || "Invoice Date"}: ${formatDate(data.date)}`, margin + 73, invoiceMetaY);
  y += 6.2;
  if (data.documentSecondLine) {
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7.8);
    doc.text(`${data.documentSecondLine.leftLabel}: ${data.documentSecondLine.leftValue}`, margin, y - 1);
    doc.text(`${data.documentSecondLine.rightLabel}: ${data.documentSecondLine.rightValue}`, margin + 73, y - 1);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    y += 4.8;
  }

  doc.setFont(fontFamily, "bold");
  doc.text("Customer Details:", margin, y);
  doc.text("Billing Address:", margin + 70, y);
  doc.text("Shipping Address:", margin + 128, y);
  y += 3.8;

  doc.setFont(fontFamily, "normal");
  const colGap = 4;
  const customerX = margin;
  const billingX = margin + 70;
  const shippingX = margin + 128;
  const customerW = billingX - customerX - colGap;
  const billingW = shippingX - billingX - colGap;
  const shippingW = pageWidth - margin - shippingX;

  const customerText = [
    data.customer.customerCode ? `Cust ID : ${data.customer.customerCode}` : "",
    data.customer.name,
    data.customer.phone ? `Ph: ${data.customer.phone}` : "",
  ].filter(Boolean).join("\n");

  const billingText = normalizeAddressText(data.billingAddress || data.customer.address || "-");
  const shippingText = normalizeAddressText(data.shippingAddress || billingText);

  const customerWrapped = doc.splitTextToSize(customerText, customerW);
  const billingWrapped = doc.splitTextToSize(billingText, billingW);
  const shippingWrapped = doc.splitTextToSize(shippingText, shippingW);

  const lineH = 3.6;
  doc.text(customerWrapped, customerX, y);
  doc.text(billingWrapped, billingX, y);
  doc.text(shippingWrapped, shippingX, y);
  const blockLines = Math.max(customerWrapped.length, billingWrapped.length, shippingWrapped.length);
  y += blockLines * lineH + 2.2;

  const placeOfSupply = data.placeOfSupply || data.customer.address || "-";
  doc.setFont(fontFamily, "bold");
  doc.text("Place of Supply:", margin, y);
  doc.setFont(fontFamily, "normal");
  doc.text(placeOfSupply, margin + 30, y);
  y += 5.2;

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  // Adjust table for export invoices (hide GST columns)
  const isExportInvoice = data.invoiceType === "EXPORT_INVOICE";
  const tableHeaders = isExportInvoice 
    ? [["#", "Item", "Rate / Item", "Quantity", "Amount"]]
    : [["#", "Item", "Rate / Item", "Taxable Value", "Tax Amount", "Amount"]];
  
  const itemsForTable = data.items.map((item, index) => {
    const qty = item.quantity || 1;
    const taxable = item.unitPrice * qty;
    const taxAmount = item.gstAmount || 0;
    const amount = item.total;
    const descLines = item.description.split("\n").filter(Boolean);
    const nameLine = descLines[0] || "Item";
    // Filter out lines that contain certificate URLs (start with http)
    const extraLines = descLines.slice(1).filter(line => 
      !line.toLowerCase().includes('http://') && 
      !line.toLowerCase().includes('https://')
    );
    const skuLine = item.sku ? `SKU: ${item.sku}` : "";
    const hsnLine = item.hsn ? `HSN: ${item.hsn}` : "";
    const itemText = [nameLine, skuLine, hsnLine, ...extraLines].filter(Boolean).join("\n");
    
    if (isExportInvoice) {
      const usd = item.usdPrice || 0;
      const displayPrice = usd > 0 ? `${data.invoiceCurrency || "USD"} ${usd.toFixed(2)}` : formatCurrencyPDF(item.unitPrice);
      const displayAmount = usd > 0 ? `${data.invoiceCurrency || "USD"} ${usd.toFixed(2)}` : formatCurrencyPDF(amount);
      return [
        index + 1,
        itemText,
        displayPrice,
        String(qty),  // Show numeric quantity only (e.g., "1") not carat weight
        displayAmount
      ];
    } else {
      return [
        index + 1,
        itemText,
        formatCurrencyPDF(item.unitPrice),
        formatCurrencyPDF(taxable),
        `${formatCurrencyPDF(taxAmount)}${item.gstRate ? ` (${item.gstRate}%)` : ""}`,
        formatCurrencyPDF(amount)
      ];
    }
  });

  // Check if any items have certificate URLs - need extra row height for QR codes
  const hasCertificateItems = data.items.some(item => item.certificateUrl);
  
  const dense = data.items.length > 8;
  const ultraDense = data.items.length > 14;
  const tableFont = ultraDense ? 6.2 : dense ? 7.2 : 8;
  // Increase padding when certificate items exist to create space between QR codes
  // Keep padding compact to fit on single page
  const basePadding = ultraDense ? 0.7 : dense ? 1.0 : 1.2;
  const tablePadding = hasCertificateItems ? basePadding + 1.5 : basePadding;
  // Minimum cell height - reduced to save space
  const minCellHeight = hasCertificateItems ? 16 : (dense ? 8 : 10);

  // Track positions for QR codes (items with certificate URLs)
  const qrCodePositions: Array<{ y: number; height: number; url: string; x: number }> = [];
  
  const columnStyles = (isExportInvoice ? {
    0: { cellWidth: 8, halign: "center" as const },
    1: { cellWidth: 80, overflow: "linebreak" as const },
    2: { cellWidth: 28, halign: "right" as const },
    3: { cellWidth: 24, halign: "center" as const },
    4: { cellWidth: 28, halign: "right" as const }
  } : {
    0: { cellWidth: 6 },
    1: { cellWidth: 76, overflow: "linebreak" as const },
    2: { cellWidth: 20, halign: "right" as const },
    3: { cellWidth: 22, halign: "right" as const },
    4: { cellWidth: 22, halign: "right" as const },
    5: { cellWidth: 20, halign: "right" as const }
  }) as { [key: number]: { cellWidth?: number; overflow?: "linebreak"; halign?: "left" | "center" | "right"; minCellHeight?: number } };

  autoTable(doc, {
    startY: y,
    head: tableHeaders,
    body: itemsForTable,
    theme: "plain",
    headStyles: {
      textColor: blue,
      font: fontFamily,
      fontStyle: "bold",
      fontSize: tableFont,
      halign: "left",
      lineWidth: 0,
      lineColor: blue,
      cellPadding: basePadding
    },
    styles: {
      font: numberFont,
      fontSize: tableFont,
      textColor: 0,
      cellPadding: tablePadding,
      lineWidth: 0,
      lineColor: lightGray,
      overflow: "linebreak"
    },
    bodyStyles: {
      minCellHeight: minCellHeight
    },
    columnStyles,
    didDrawCell: (dataCell) => {
      const { row, table, column, section, cell } = dataCell;
      const rowMeta = row as unknown as { y?: number; height?: number; raw?: unknown[] };
      const tableMeta = table as unknown as { startX?: number; width?: number; columns?: Array<{ width?: number; w?: number }> };
      const startX = Number.isFinite(tableMeta.startX) ? tableMeta.startX as number : cell.x;
      const columnWidths = tableMeta.columns?.reduce((sum, col) => sum + (col.width || col.w || 0), 0);
      const width = Number.isFinite(tableMeta.width)
        ? tableMeta.width as number
        : Number.isFinite(columnWidths)
        ? columnWidths as number
        : cell.width;
      const rowY = Number.isFinite(rowMeta.y) ? rowMeta.y as number : cell.y;
      const rowH = Number.isFinite(rowMeta.height) ? rowMeta.height as number : cell.height;
      if (!Number.isFinite(startX) || !Number.isFinite(width) || !Number.isFinite(rowY) || !Number.isFinite(rowH)) return;
      
      // Track row position for QR code (only for first column in body section)
      if (section === "body" && column.index === 0) {
        const rowIndex = row.index;
        const item = data.items[rowIndex];
        if (item?.certificateUrl) {
          // Calculate table right edge based on page dimensions
          // Table starts at margin and has specific column widths
          const tableRightX = margin + (isExportInvoice 
            ? (8 + 80 + 28 + 24 + 28)  // Export columns: #, Item, Rate, Qty, Amount
            : (6 + 76 + 20 + 22 + 22 + 20)  // Domestic columns
          );
          qrCodePositions.push({ 
            y: rowY, 
            height: rowH, 
            url: item.certificateUrl,
            x: Math.min(tableRightX + 2, pageWidth - margin - 15) // Ensure QR doesn't go off page
          });
        }
      }
      
      if (column.index !== 0) return;
      if (section === "head") {
        doc.setDrawColor(...blue);
        doc.setLineWidth(0.45);
        doc.line(startX, rowY, startX + width, rowY);
        doc.line(startX, rowY + rowH, startX + width, rowY + rowH);
      }
      if (section === "body") {
        doc.setDrawColor(160, 195, 235);
        doc.setLineWidth(0.25);
        doc.line(startX, rowY + rowH, startX + width, rowY + rowH);
      }
    }
  });
  
  // Generate and add QR codes after table is rendered
  if (qrCodePositions.length > 0) {
    for (const pos of qrCodePositions) {
      try {
        const qrDataUrl = await QRCode.toDataURL(pos.url, {
          width: 100,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
        const qrSize = 13; // QR code size in mm
        const qrX = pos.x;
        // Center QR code vertically within the row
        const qrY = pos.y + (pos.height - qrSize) / 2;
        doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } catch (e) {
        // Silently skip if QR generation fails
      }
    }
    
  }

  // @ts-expect-error - jspdf-autotable types mismatch
  y = doc.lastAutoTable.finalY + 6;
  
  // Add QR code verification note if there are certificate items
  if (qrCodePositions.length > 0) {
    doc.setFont(fontFamily, "italic");
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("* Scan QR code next to item to verify certificate authenticity", margin, y);
    doc.setTextColor(0);
    doc.setFont(fontFamily, "normal");
    y += 5;
  }

  const totalUsdValue = isExportInvoice
    ? data.items.reduce((sum, item) => sum + (item.usdPrice || 0), 0)
    : 0;
  const taxableTotal = data.items.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);
  const taxRate = taxableTotal > 0 ? (data.tax * 100) / taxableTotal : 0;
  const halfRate = taxRate / 2;
  const cgst = data.tax / 2;
  const sgst = data.tax / 2;

  const totalsX = pageWidth - margin - 58;
  const wordsY = y;
  const totalItems = data.items.length;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  doc.text(`Total Items : ${totalItems}`, margin, wordsY);
  doc.setFont(fontFamily, "normal");
  
  // For export invoices, show both USD and INR amounts in words
  if (isExportInvoice) {
    const usdAmount = totalUsdValue > 0 ? totalUsdValue : (data.total / (data.conversionRate || 1));
    const usdWords = convertNumberToWords(usdAmount, data.invoiceCurrency || "USD");
    const inrAmount = data.total; // Original INR amount
    const inrWords = convertNumberToWords(inrAmount, "INR");
    
    doc.text(`Total amount (in words): ${usdWords}`, margin, wordsY + 4);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`(INR ${inrWords})`, margin, wordsY + 8);
    doc.setTextColor(0);
    doc.setFontSize(8);
  } else {
    const inrWords = convertNumberToWords(data.total, "INR");
    doc.text(`Total amount (in words): ${inrWords}`, margin, wordsY + 4);
  }

  let totalsY = y;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  if (typeof data.grossTotal === "number" && Number.isFinite(data.grossTotal) && data.discount > 0) {
    doc.text("Gross Amount", totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(data.grossTotal), pageWidth - margin, totalsY);
    totalsY += 4;

    doc.text("Discount", totalsX, totalsY);
    writeAmountRight(`-${formatCurrencyPDF(data.discount)}`, pageWidth - margin, totalsY);
    totalsY += 4;
  }

  if (isExportInvoice) {
    const usdTaxable = totalUsdValue > 0 ? totalUsdValue : (data.total / (data.conversionRate || 1));
    doc.text(`Taxable Amount (${data.invoiceCurrency || "USD"})`, totalsX, totalsY);
    writeAmountRight(`${data.invoiceCurrency || "USD"} ${usdTaxable.toFixed(2)}`, pageWidth - margin, totalsY);
    totalsY += 4;
    doc.text("GST", totalsX, totalsY);
    doc.setTextColor(0, 150, 80);
    writeAmountRight("NIL (Zero Rated)", pageWidth - margin, totalsY);
    doc.setTextColor(0);
    totalsY += 4;
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.text(`Total (${data.invoiceCurrency || "USD"})`, totalsX, totalsY);
    writeAmountRight(`${data.invoiceCurrency || "USD"} ${usdTaxable.toFixed(2)}`, pageWidth - margin, totalsY, { bold: true, fontSize: 10 });
    totalsY += 5;
    
    // Show INR equivalent for export invoices
    if (data.conversionRate && data.conversionRate > 0) {
      // Add small line above INR amount for clarity
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(totalsX + 15, totalsY - 2, pageWidth - margin - 15, totalsY - 2);
      
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const inrTotal = usdTaxable * data.conversionRate;
      doc.text(`(INR ${inrTotal.toFixed(2)})`, totalsX + 15, totalsY);
      doc.setTextColor(0);
      totalsY += 4;
    }
    
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(8);
  } else {
    doc.text("Taxable Amount", totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(taxableTotal), pageWidth - margin, totalsY);
    totalsY += 4;
    doc.text(`CGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(cgst), pageWidth - margin, totalsY);
    totalsY += 4;
    doc.text(`SGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(sgst), pageWidth - margin, totalsY);
    totalsY += 4;
  }

  if (!(typeof data.grossTotal === "number" && Number.isFinite(data.grossTotal) && data.discount > 0) && data.discount > 0) {
    doc.text("Discount", totalsX, totalsY);
    writeAmountRight(`-${formatCurrencyPDF(data.discount)}`, pageWidth - margin, totalsY);
    totalsY += 4;
  }

  if (data.shippingCharge && data.shippingCharge > 0) {
    doc.text("Shipping Charges", totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(data.shippingCharge), pageWidth - margin, totalsY);
    totalsY += 4;
  }

  if (data.additionalCharge && data.additionalCharge > 0) {
    doc.text("Additional Charges", totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(data.additionalCharge), pageWidth - margin, totalsY);
    totalsY += 4;
  }

  if (!isExportInvoice) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.text(data.totalLabel || "Total", totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(data.total), pageWidth - margin, totalsY, { bold: true, fontSize: 10 });
    totalsY += 6;
  }

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  if (data.discount > 0) {
    doc.text(`Total Discount`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(data.discount), pageWidth - margin, totalsY);
    totalsY += 5;
  }

  if (data.extraTotalRows && data.extraTotalRows.length > 0) {
    for (const row of data.extraTotalRows) {
      doc.setFont(fontFamily, row.emphasis === "bold" ? "bold" : "normal");
      doc.setFontSize(8);
      doc.text(row.label, totalsX, totalsY);
      writeAmountRight(formatCurrencyPDF(row.amount), pageWidth - margin, totalsY, { bold: row.emphasis === "bold" });
      totalsY += 4;
    }
    doc.setFont(fontFamily, "normal");
  }

  // Calculate next Y position based on lines used for amount in words
  const wordsLinesCount = isExportInvoice ? 2 : 1; // Export has 2 lines (USD + INR), domestic has 1
  y = Math.max(totalsY, wordsY + 4 + (wordsLinesCount * 3.5)) + 1;

  const showPaymentSection = data.showPaymentSection !== false;
  const showBankDetailsSection = data.showBankDetailsSection !== false;

  if (showPaymentSection && data.amountPaid > 0) {
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("Amount Paid", pageWidth - margin - 40, y, { align: "right" });
    if (isExportInvoice && data.conversionRate && data.conversionRate > 1) {
      const usdPaid = data.amountPaid / data.conversionRate;
      writeAmountRight(`${data.invoiceCurrency || "USD"} ${usdPaid.toFixed(2)}`, pageWidth - margin, y, { bold: true });
    } else {
      writeAmountRight(formatCurrencyPDF(data.amountPaid), pageWidth - margin, y, { bold: true });
    }
    doc.setTextColor(0);
    y += 3;
    
    // Show INR equivalent for Amount Paid on export invoices
    if (isExportInvoice && data.conversionRate && data.conversionRate > 1) {
      // Add small line above INR amount for clarity
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.2);
      doc.line(pageWidth - margin - 50, y - 1, pageWidth - margin, y - 1);
      
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const inrPaid = data.amountPaid;
      doc.text(`(INR ${inrPaid.toFixed(2)})`, pageWidth - margin, y, { align: "right" });
      doc.setTextColor(0);
      y += 3;
    }
    // Skip payment breakdown for export invoices - only show totals
    // This prevents duplicate USD amounts from showing
    if (!isExportInvoice && data.paymentBreakdown && data.paymentBreakdown.length > 0 && 
        !(data.paymentBreakdown.length === 1 && Math.abs(data.paymentBreakdown[0].amount) === data.amountPaid)) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      for (const row of data.paymentBreakdown) {
        const sign = row.amount < 0 ? "-" : "";
        writeAmountRight(`${row.method}: ${sign}${formatCurrencyPDF(Math.abs(row.amount))}`, pageWidth - margin, y - 1);
        y += 3;
      }
      y += 2;
    }
    if (!isExportInvoice && (!data.paymentBreakdown || data.paymentBreakdown.length === 0) && (data.paidAt || data.paymentMethod)) {
      const paidParts = [
        data.paymentMethod ? `via ${data.paymentMethod}` : "",
        data.paidAt ? `on ${formatDate(data.paidAt)}` : ""
      ].filter(Boolean).join(" ");
      if (paidParts) {
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(7);
        doc.text(paidParts, pageWidth - margin, y - 1, { align: "right" });
      }
    }
  } else if (showPaymentSection && data.balanceDue > 0) {
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("Balance Due", pageWidth - margin - 40, y, { align: "right" });
    writeAmountRight(formatCurrencyPDF(data.balanceDue), pageWidth - margin, y, { bold: true });
    doc.setTextColor(0);
    y += 5;
  }

  let infoY = y + 3;
  if (showBankDetailsSection) {
    doc.setFont(fontFamily, "bold");
    doc.text("Bank Details:", margin, infoY);
    doc.setFont(fontFamily, "normal");
    if (data.bankDetails) {
      let bdY = infoY + 4;
      doc.text(`Bank: ${data.bankDetails.bankName}`, margin, bdY); bdY += 4;
      doc.text(`Account #: ${data.bankDetails.accountNumber}`, margin, bdY); bdY += 4;
      doc.text(`IFSC code: ${data.bankDetails.ifsc}`, margin, bdY); bdY += 4;
      if (isExportInvoice && data.bankDetails.swiftCode) {
        doc.text(`SWIFT code: ${data.bankDetails.swiftCode}`, margin, bdY); bdY += 4;
      }
      doc.text(`Account Holder: ${data.bankDetails.holder}`, margin, bdY); bdY += 4;
      infoY = bdY + 2;
    } else {
      doc.text("-", margin, infoY + 4);
      infoY += 24;
    }
  }
  const wrapWidth = pageWidth - margin * 2 - 80; // Wider text area for terms
  const termsToUse = isExportInvoice
    ? (data.exportTerms || data.terms || "")
    : (data.terms || "");
  if (termsToUse) {
    doc.setFont(fontFamily, "bold");
    doc.text("Terms & Conditions:", margin, infoY);
    doc.setFont(fontFamily, "normal");
    const lines = doc.splitTextToSize(termsToUse, wrapWidth);
    doc.text(lines, margin, infoY + 3);
    infoY += 3 + lines.length * 3.5;
  }

  if (data.notes) {
    doc.setFont(fontFamily, "bold");
    doc.text("Notes:", margin, infoY + 2);
    doc.setFont(fontFamily, "normal");
    const raw = String(data.notes || "");
    const blocks = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const cnBlocks = blocks.filter((l) => l.toLowerCase().startsWith("credit note(s):"));
    const otherBlocks = blocks.filter((l) => !l.toLowerCase().startsWith("credit note(s):"));

    let noteY = infoY + 5;
    if (otherBlocks.length) {
      const otherLines = doc.splitTextToSize(otherBlocks.join("\n"), wrapWidth);
      doc.text(otherLines, margin, noteY);
      noteY += otherLines.length * 3.5 + 2;
    }

    if (cnBlocks.length) {
      const cnText = cnBlocks.join("\n");
      doc.setFont(fontFamily, "bold");
      const cnLines = doc.splitTextToSize(cnText, wrapWidth - 6);
      const boxH = cnLines.length * 3.5 + 6;
      doc.setFillColor(254, 249, 195);
      doc.roundedRect(margin, noteY - 4, wrapWidth, boxH, 2, 2, "F");
      doc.setTextColor(124, 45, 18);
      doc.text(cnLines, margin + 3, noteY);
      noteY += boxH + 2;
      doc.setTextColor(0);
      doc.setFont(fontFamily, "normal");
    }
    infoY = noteY + 2;
  }

  if (isExportInvoice) {
    infoY += 3;
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...blue);
    doc.text("Declaration:", margin, infoY);
    doc.setFont(fontFamily, "normal");
    doc.setTextColor(0);
    const declaration = "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. The goods are exported under Letter of Undertaking (LUT) without payment of IGST as per GST law.";
    const declLines = doc.splitTextToSize(declaration, pageWidth - margin * 2);
    doc.text(declLines, margin, infoY + 3);
    infoY += 3 + declLines.length * 4 + 2;
  }

  // Position footer at bottom of page
  // Reserve 20mm for footer section (signature + text) - reduced to fit on single page
  const footerHeight = 18;
  let signatureY = infoY + 2;
  
  // Ensure footer stays at bottom of page without creating new page
  const minSignatureY = pageHeight - margin - footerHeight;
  if (signatureY < minSignatureY) {
    signatureY = minSignatureY;
  }
  
  // Ensure signature section doesn't overflow page bottom
  const maxSignatureY = pageHeight - margin - 20;
  if (signatureY > maxSignatureY) {
    signatureY = maxSignatureY;
  }
  
  // Draw signature section on the right side
  if (signatureDataUrl) {
    const boxW = 26;
    const boxH = 10;
    const s = Math.min(boxW / (sigW || boxW), boxH / (sigH || boxH));
    const w = (sigW || boxW) * s;
    const h = (sigH || boxH) * s;
    doc.addImage(signatureDataUrl, "PNG", pageWidth - margin - w, signatureY, w, h, undefined, "FAST");
  }
  
  // Company name above signature
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.setFontSize(6.5);
  doc.text(`For ${data.company.name}`, pageWidth - margin, signatureY - 2, { align: "right" });
  
  // Authorized Signatory label below signature box
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Authorized Signatory", pageWidth - margin, signatureY + 8, { align: "right" });

  // Thank you message at the very bottom
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5);
  doc.text(`Thank you for Shopping with ${data.company.name}.`, margin, signatureY + 20);

  return doc.output("blob");
}
