import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { formatInrCurrency, sanitizeNumberText } from "@/lib/number-formatting";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
    website?: string;
    logoUrl?: string;
  };
  customer: {
    name: string;
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
    unitPrice: number; // Base Price
    gstRate?: number;
    gstAmount?: number;
    total: number;
  }[];
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
    normal: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.ttf",
    bold: "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.ttf",
    italic: "https://fonts.gstatic.com/s/poppins/v20/pxiGyp8kv8JHgFVrJJLucHtF.ttf",
    bolditalic: "https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmy1zlFPE.ttf",
  },
};

const loadedFonts = new Set<string>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
  return binary;
}

async function loadFont(doc: jsPDF, family: string) {
  if (loadedFonts.has(family)) return;
  const fontDef = FONTS[family];
  if (!fontDef) return;

  const promises = [
    fetch(fontDef.normal).then((r) => (r.ok ? r.arrayBuffer() : null)),
    fetch(fontDef.bold).then((r) => (r.ok ? r.arrayBuffer() : null)),
  ];
  if (fontDef.italic) promises.push(fetch(fontDef.italic).then((r) => (r.ok ? r.arrayBuffer() : null)));
  if (fontDef.bolditalic) promises.push(fetch(fontDef.bolditalic).then((r) => (r.ok ? r.arrayBuffer() : null)));

  const [normBuf, boldBuf, italicBuf, boldItalicBuf] = await Promise.all(promises);

  if (normBuf) {
    const normStr = arrayBufferToBinaryString(normBuf);
    doc.addFileToVFS(`${family}-Regular.ttf`, normStr);
    doc.addFont(`${family}-Regular.ttf`, family, "normal");
  }
  if (boldBuf) {
    const boldStr = arrayBufferToBinaryString(boldBuf);
    doc.addFileToVFS(`${family}-Bold.ttf`, boldStr);
    doc.addFont(`${family}-Bold.ttf`, family, "bold");
  }
  if (italicBuf && fontDef.italic) {
    const italicStr = arrayBufferToBinaryString(italicBuf);
    doc.addFileToVFS(`${family}-Italic.ttf`, italicStr);
    doc.addFont(`${family}-Italic.ttf`, family, "italic");
  }
  if (boldItalicBuf && fontDef.bolditalic) {
    const biStr = arrayBufferToBinaryString(boldItalicBuf);
    doc.addFileToVFS(`${family}-BoldItalic.ttf`, biStr);
    doc.addFont(`${family}-BoldItalic.ttf`, family, "bolditalic");
  }

  loadedFonts.add(family);
}

function convertNumberToWords(amount: number): string {
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

  const [rupees, paise] = amount.toFixed(2).split(".");
  const rupeesInt = parseInt(rupees);
  const paiseInt = parseInt(paise);

  let words = rupeesInt === 0 ? "Zero Rupees" : convertToWords(rupeesInt) + " Rupees";
  if (paiseInt > 0) {
    words += " and " + convertToWords(paiseInt) + " Paise";
  }
  return words + " Only";
}

export async function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  await loadFont(doc, "notosansdisplay");
  await loadFont(doc, "poppins");
  const fontFamily = loadedFonts.has("poppins") ? "poppins" : (loadedFonts.has("notosansdisplay") ? "notosansdisplay" : "helvetica");
  const numberFont = loadedFonts.has("notosansdisplay") ? "notosansdisplay" : fontFamily;
  doc.setCharSpace(0);

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

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...blue);
  doc.text("TAX INVOICE", margin, y);
  doc.setFontSize(7.2);
  doc.setTextColor(0);
  doc.text("ORIGINAL FOR RECIPIENT", pageWidth - margin - 34, y, { align: "right" });
  y += 5.5;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(0);
  doc.text(data.company.name, margin, y);

  const logoBoxW = 30;
  const logoBoxH = 20;
  if (logoDataUrl) {
    const scale = Math.min(logoBoxW / (logoW || logoBoxW), logoBoxH / (logoH || logoBoxH));
    const w = (logoW || logoBoxW) * scale;
    const h = (logoH || logoBoxH) * scale;
    doc.addImage(logoDataUrl, "PNG", pageWidth - margin - w, margin + 4, w, h, undefined, "FAST");
  }

  y += 3.5;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  const gstLine = data.company.gstin ? `GSTIN ${data.company.gstin}` : "";
  const panLine = panFromGstin ? `PAN ${panFromGstin}` : "";
  doc.text([gstLine, panLine].filter(Boolean).join("   "), margin, y);

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

  const invoiceMetaY = y;
  doc.setFont(fontFamily, "bold");
  doc.text(`Invoice #: ${data.invoiceNumber}`, margin, invoiceMetaY);
  doc.text(`Invoice Date: ${formatDate(data.date)}`, margin + 73, invoiceMetaY);
  y += 6.2;

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
    data.customer.name,
    data.customer.phone ? `Ph: ${data.customer.phone}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const billingText = data.billingAddress || data.customer.address || "-";
  const shippingText = data.shippingAddress || billingText;

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

  const items = data.items.map((item, index) => {
    const qty = item.quantity || 1;
    const taxable = item.unitPrice * qty;
    const taxAmount = item.gstAmount || 0;
    const amount = item.total;
    const descLines = item.description.split("\n").filter(Boolean);
    const nameLine = descLines[0] || "Item";
    const extraLines = descLines.slice(1);
    const skuLine = item.sku ? `SKU: ${item.sku}` : "";
    const hsnLine = item.hsn ? `HSN: ${item.hsn}` : "";
    const itemText = [nameLine, skuLine, hsnLine, ...extraLines].filter(Boolean).join("\n");
    return [
      index + 1,
      itemText,
      formatCurrencyPDF(item.unitPrice),
      formatCurrencyPDF(taxable),
      `${formatCurrencyPDF(taxAmount)}${item.gstRate ? ` (${item.gstRate}%)` : ""}`,
      formatCurrencyPDF(amount)
    ];
  });

  const dense = data.items.length > 8;
  const ultraDense = data.items.length > 14;
  const tableFont = ultraDense ? 6.2 : dense ? 7.2 : 8;
  const tablePadding = ultraDense ? 0.7 : dense ? 1.1 : 1.5;

  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Rate / Item", "Taxable Value", "Tax Amount", "Amount"]],
    body: items,
    theme: "plain",
    headStyles: {
      textColor: blue,
      font: fontFamily,
      fontStyle: "bold",
      fontSize: tableFont,
      halign: "left",
      lineWidth: 0,
      lineColor: blue
    },
    styles: {
      font: numberFont,
      fontSize: tableFont,
      textColor: 0,
      cellPadding: tablePadding,
      lineWidth: 0,
      lineColor: lightGray,
      overflow: "linebreak",
      charSpace: 0
    },
    columnStyles: {
      0: { cellWidth: 6 },
      1: { cellWidth: 76, overflow: "linebreak" },
      2: { cellWidth: 22, halign: "right" },
      3: { cellWidth: 25, halign: "right" },
      4: { cellWidth: 25, halign: "right" },
      5: { cellWidth: 24, halign: "right" }
    },
    didDrawCell: (dataCell) => {
      const { row, table, column, section, cell } = dataCell;
      if (column.index !== 0) return;
      const rowMeta = row as unknown as { y?: number; height?: number };
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

  // @ts-expect-error - jspdf-autotable types mismatch
  y = doc.lastAutoTable.finalY + 8;

  const taxableTotal = data.items.reduce((sum, item) => sum + (item.unitPrice * (item.quantity || 1)), 0);
  const taxRate = taxableTotal > 0 ? (data.tax * 100) / taxableTotal : 0;
  const halfRate = taxRate / 2;
  const cgst = data.tax / 2;
  const sgst = data.tax / 2;

  const totalsX = pageWidth - margin - 58;
  const wordsY = y;
  const amountWords = convertNumberToWords(data.total);
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  const totalItems = data.items.length;
  doc.text(`Total Items : ${totalItems}`, margin, wordsY);
  doc.setFont(fontFamily, "normal");
  const wordsLines = doc.splitTextToSize(`Total amount (in words): INR ${amountWords}`, 95);
  doc.text(wordsLines, margin, wordsY + 4);

  let totalsY = y;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  doc.text("Taxable Amount", totalsX, totalsY);
  doc.text(formatCurrencyPDF(taxableTotal), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 4;

  doc.text(`CGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
  doc.text(formatCurrencyPDF(cgst), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 4;

  doc.text(`SGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
  doc.text(formatCurrencyPDF(sgst), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 4;

  if (data.discount > 0) {
    doc.text("Discount", totalsX, totalsY);
    doc.text(`-${formatCurrencyPDF(data.discount)}`, pageWidth - margin, totalsY, { align: "right" });
    totalsY += 4;
  }

  if (data.shippingCharge && data.shippingCharge > 0) {
    doc.text("Shipping Charges", totalsX, totalsY);
    doc.text(formatCurrencyPDF(data.shippingCharge), pageWidth - margin, totalsY, { align: "right" });
    totalsY += 4;
  }

  if (data.additionalCharge && data.additionalCharge > 0) {
    doc.text("Additional Charges", totalsX, totalsY);
    doc.text(formatCurrencyPDF(data.additionalCharge), pageWidth - margin, totalsY, { align: "right" });
    totalsY += 4;
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.text("Total", totalsX, totalsY);
  doc.text(formatCurrencyPDF(data.total), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 6;

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(8);
  doc.text(`Total Discount`, totalsX, totalsY);
  doc.text(formatCurrencyPDF(data.discount), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 5;

  y = Math.max(totalsY, wordsY + 4 + (wordsLines.length * 4)) + 2;

  if (data.amountPaid > 0) {
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(22, 163, 74);
    doc.text("Amount Paid", pageWidth - margin - 40, y, { align: "right" });
    doc.text(formatCurrencyPDF(data.amountPaid), pageWidth - margin, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
    if (data.paymentBreakdown && data.paymentBreakdown.length > 0) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      for (const row of data.paymentBreakdown) {
        const sign = row.amount < 0 ? "-" : "";
        doc.text(`${row.method}: ${sign}${formatCurrencyPDF(Math.abs(row.amount))}`, pageWidth - margin, y - 1, { align: "right" });
        y += 4;
      }
      y += 2;
    }
    if ((!data.paymentBreakdown || data.paymentBreakdown.length === 0) && (data.paidAt || data.paymentMethod)) {
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
  } else if (data.balanceDue > 0) {
    doc.setFont(fontFamily, "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("Balance Due", pageWidth - margin - 40, y, { align: "right" });
    doc.text(formatCurrencyPDF(data.balanceDue), pageWidth - margin, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }

  y += 4;
  doc.setFont(fontFamily, "bold");
  doc.text("Bank Details:", margin, y);
  doc.setFont(fontFamily, "normal");
  if (data.bankDetails) {
    doc.text(`Bank: ${data.bankDetails.bankName}`, margin, y + 4);
    doc.text(`Account #: ${data.bankDetails.accountNumber}`, margin, y + 8);
    doc.text(`IFSC code: ${data.bankDetails.ifsc}`, margin, y + 12);
    doc.text(`Account Holder: ${data.bankDetails.holder}`, margin, y + 16);
  } else {
    doc.text("-", margin, y + 4);
  }

  let infoY = y + 24;
  const wrapWidth = pageWidth - margin * 2 - 60;
  if (data.terms) {
    doc.setFont(fontFamily, "bold");
    doc.text("Terms & Conditions:", margin, infoY);
    doc.setFont(fontFamily, "normal");
    const lines = doc.splitTextToSize(data.terms, wrapWidth);
    doc.text(lines, margin, infoY + 4);
    infoY += 4 + lines.length * 4;
  }

  if (data.notes) {
    doc.setFont(fontFamily, "bold");
    doc.text("Notes:", margin, infoY + 2);
    doc.setFont(fontFamily, "normal");
    const lines = doc.splitTextToSize(data.notes, wrapWidth);
    doc.text(lines, margin, infoY + 6);
  }

  const signatureY = pageHeight - 55;
  if (signatureDataUrl) {
    const boxW = 40;
    const boxH = 18;
    const s = Math.min(boxW / (sigW || boxW), boxH / (sigH || boxH));
    const w = (sigW || boxW) * s;
    const h = (sigH || boxH) * s;
    doc.addImage(signatureDataUrl, "PNG", pageWidth - margin - w, signatureY, w, h, undefined, "FAST");
  }
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray);
  doc.text(`For ${data.company.name}`, pageWidth - margin, signatureY - 4, { align: "right" });
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", pageWidth - margin, signatureY + 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Thank you for Shopping with ${data.company.name}.`, margin, pageHeight - 30);

  return doc.output("blob");
}
