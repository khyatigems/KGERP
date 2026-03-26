import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { sanitizeNumberText } from "@/lib/number-formatting";
import { Buffer } from "buffer";

const FONTS = {
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

type CachedFontData = { normal?: string; bold?: string; italic?: string; bolditalic?: string };
const cachedFontData = new Map<string, CachedFontData>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
  return result;
}

async function loadFont(doc: jsPDF, family: "notosansdisplay" | "poppins") {
  const fontDef = FONTS[family];
  if (!fontDef) return;

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
}

export async function generateCreditNotePDF(input: {
  company: { name: string; address?: string; email?: string; phone?: string; website?: string; gstin?: string; logoUrl?: string };
  customer: { name: string; customerCode?: string; address?: string; phone?: string; email?: string };
  creditNoteNumber: string;
  invoiceNumber?: string;
  issueDate: Date;
  expiryDate?: Date;
  items: Array<{ description: string; qty: number; price: number }>;
  taxableAmount?: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
  totalTax?: number;
  totalAmount: number;
  balanceAmount?: number;
  signatureUrl?: string;
  terms?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await loadFont(doc, "notosansdisplay");
  await loadFont(doc, "poppins");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 11;
  const blue = [37, 99, 235] as [number, number, number];
  const gray = [100, 116, 139] as [number, number, number];

  doc.setCharSpace(0);

  const logo = await fetchImageAsDataUrl(input.company.logoUrl);
  const signature = await fetchImageAsDataUrl(input.signatureUrl);

  const fontFamily = "poppins";
  const numberFont = "notosansdisplay";
  doc.setFont(fontFamily, "normal");

  const formatCurrencyPDF = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "₹0.00";
    try {
      const fmt = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return sanitizeNumberText(`₹${fmt.format(amount)}`);
    } catch {
      return sanitizeNumberText(`₹${Number(amount).toFixed(2)}`);
    }
  };

  const writeAmountRight = (text: string, x: number, y: number, opts?: { bold?: boolean; fontSize?: number }) => {
    doc.setFont(numberFont, opts?.bold ? "bold" : "normal");
    doc.setFontSize(opts?.fontSize || 8);
    doc.text(text, x, y, { align: "right" });
    doc.setFont(fontFamily, "normal");
  };

  const normalizeAddressText = (v: string) =>
    String(v || "")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/(\d)([A-Za-z])/g, "$1 $2")
      .replace(/([A-Za-z])(\d)/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();

  const convertNumberToWords = (amount: number) => {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const convertToWords = (n: number): string => {
      if (n === 0) return "";
      if (n < 20) return units[n];
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
    if (paiseInt > 0) words += " and " + convertToWords(paiseInt) + " Paise";
    return words + " Only";
  };

  const logoBoxW = 30;
  const logoBoxH = 20;
  const logoRender = (() => {
    if (!logo?.dataUrl) return null;
    const w0 = 120;
    const h0 = 80;
    const scale = Math.min(logoBoxW / w0, logoBoxH / h0);
    const w = w0 * scale;
    const h = h0 * scale;
    const x = pageWidth - margin - w;
    const y = margin + 4;
    return { x, y, w, h };
  })();

  let y = margin + 8;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...blue);
  doc.text("CREDIT NOTE", margin, y);
  doc.setFontSize(7.2);
  doc.setTextColor(0);
  if (logoRender) {
    doc.text("ORIGINAL FOR RECIPIENT", logoRender.x + logoRender.w / 2, logoRender.y - 2.4, { align: "center" });
  } else {
    doc.text("ORIGINAL FOR RECIPIENT", pageWidth - margin, y, { align: "right" });
  }
  y += 5.5;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(0);
  doc.text(input.company.name, margin, y);

  if (logoRender && logo?.dataUrl) {
    try {
      doc.addImage(logo.dataUrl, logo.kind, logoRender.x, logoRender.y, logoRender.w, logoRender.h, undefined, "FAST");
    } catch {}
  }

  const panFromGstin = input.company.gstin && input.company.gstin.length >= 12
    ? input.company.gstin.substring(2, 12)
    : "";

  y += 3.5;
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  const gstLine = input.company.gstin ? `GSTIN ${input.company.gstin}` : "";
  const panLine = panFromGstin ? `PAN ${panFromGstin}` : "";
  doc.text([gstLine, panLine].filter(Boolean).join("   "), margin, y);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.8);
  doc.text(input.company.phone ? `Mobile: ${input.company.phone}` : "", margin, y + 4.5);
  if (input.company.email) {
    doc.text(`Email: ${input.company.email}`, margin + 58, y + 4.5);
  }
  if (input.company.website) {
    doc.text(`Website: ${input.company.website}`, margin, y + 8.3);
    y += 11.7;
  } else {
    y += 9.1;
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  doc.text(`CN #: ${input.creditNoteNumber}`, margin, y);
  doc.text(`CN Date: ${formatDate(input.issueDate)}`, margin + 73, y);
  y += 5.2;
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.8);
  const refInv = input.invoiceNumber ? String(input.invoiceNumber) : "-";
  const expiry = input.expiryDate ? formatDate(input.expiryDate) : "-";
  doc.text(`Ref Invoice: ${refInv}`, margin, y);
  doc.text(`Expiry Date: ${expiry}`, margin + 73, y);
  y += 5.2;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
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
    input.customer.customerCode ? `Cust ID : ${input.customer.customerCode}` : "",
    input.customer.name,
    input.customer.phone ? `Ph: ${input.customer.phone}` : "",
  ].filter(Boolean).join("\n");

  const billingText = normalizeAddressText(input.customer.address || "-");
  const shippingText = normalizeAddressText(input.customer.address || billingText);

  const customerWrapped = doc.splitTextToSize(customerText, customerW);
  const billingWrapped = doc.splitTextToSize(billingText, billingW);
  const shippingWrapped = doc.splitTextToSize(shippingText, shippingW);
  const lineH = 3.6;
  doc.text(customerWrapped, customerX, y);
  doc.text(billingWrapped, billingX, y);
  doc.text(shippingWrapped, shippingX, y);
  const blockLines = Math.max(customerWrapped.length, billingWrapped.length, shippingWrapped.length);
  y += blockLines * lineH + 2.2;

  doc.setFont(fontFamily, "bold");
  doc.text("Place of Supply:", margin, y);
  doc.setFont(fontFamily, "normal");
  doc.text("-", margin + 30, y);
  y += 5.2;

  doc.setDrawColor(...blue);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 2;

  const taxableTotal = input.taxableAmount ?? input.items.reduce((s, it) => s + Number(it.price || 0) * Number(it.qty || 0), 0);
  const totalTax = input.totalTax ?? (Number(input.cgst || 0) + Number(input.sgst || 0) + Number(input.igst || 0));
  const taxRate = taxableTotal > 0 ? (totalTax * 100) / taxableTotal : 0;

  const rows = input.items.map((i, idx) => {
    const qty = Number(i.qty || 0) || 0;
    const taxable = Number(i.price || 0) * (qty || 1);
    const taxAmount = taxable * (taxRate / 100);
    const amount = taxable + taxAmount;
    return [
      String(idx + 1),
      String(i.description || ""),
      formatCurrencyPDF(i.price),
      formatCurrencyPDF(taxable),
      formatCurrencyPDF(taxAmount),
      formatCurrencyPDF(amount),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Rate / Item", "Taxable Value", "Tax Amount", "Amount"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2, font: numberFont },
    headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: "bold", font: fontFamily },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      2: { cellWidth: 26, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 24, halign: "right" },
      5: { cellWidth: 30, halign: "right" },
    },
  });

  const afterTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
  const wordsY = afterTableY + 6;
  const amountWords = convertNumberToWords(Number(input.totalAmount || 0));
  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  doc.text(`Total Items : ${input.items.length}`, margin, wordsY);
  doc.setFont(fontFamily, "normal");
  doc.setFontSize(7.8);
  const wordsLines = doc.splitTextToSize(`Total amount (in words): INR ${amountWords}`, 95);
  doc.text(wordsLines, margin, wordsY + 4);

  let totalsY = afterTableY + 6;
  const totalsX = pageWidth - margin - 58;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(8);
  doc.text("Taxable Amount", totalsX, totalsY);
  writeAmountRight(formatCurrencyPDF(taxableTotal), pageWidth - margin, totalsY);
  totalsY += 4;

  const igst = Number(input.igst || 0);
  const cgst = Number(input.cgst || 0);
  const sgst = Number(input.sgst || 0);
  if (igst > 0) {
    doc.setFont(fontFamily, "normal");
    doc.text(`IGST ${taxRate.toFixed(3)}%`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(igst), pageWidth - margin, totalsY);
    totalsY += 4;
  } else {
    const halfRate = taxRate / 2;
    doc.setFont(fontFamily, "normal");
    doc.text(`CGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(cgst), pageWidth - margin, totalsY);
    totalsY += 4;
    doc.text(`SGST ${halfRate.toFixed(3)}%`, totalsX, totalsY);
    writeAmountRight(formatCurrencyPDF(sgst), pageWidth - margin, totalsY);
    totalsY += 4;
  }

  doc.setFont(fontFamily, "bold");
  doc.text("Total Tax", totalsX, totalsY);
  writeAmountRight(formatCurrencyPDF(totalTax), pageWidth - margin, totalsY);
  totalsY += 5.2;

  doc.setFontSize(10);
  doc.text("Credit Note Amount", totalsX, totalsY);
  writeAmountRight(formatCurrencyPDF(input.totalAmount), pageWidth - margin, totalsY, { bold: true, fontSize: 10 });
  totalsY += 5.5;

  doc.setFontSize(8);
  doc.setFont(fontFamily, "normal");
  doc.text("Available Balance", totalsX, totalsY);
  writeAmountRight(formatCurrencyPDF(input.balanceAmount ?? input.totalAmount), pageWidth - margin, totalsY, { bold: true });

  const infoY = Math.max(totalsY + 8, wordsY + 4 + (wordsLines.length * 4)) + 2;
  const wrapWidth = pageWidth - margin * 2 - 60;
  const footerTerms = [
    input.terms || "",
    input.expiryDate ? `This credit note is valid until ${formatDate(input.expiryDate)}.` : "",
  ]
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join("\n");

  if (footerTerms) {
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("Terms & Conditions:", margin, infoY);
    doc.setFont(fontFamily, "normal");
    const lines = doc.splitTextToSize(footerTerms, wrapWidth);
    doc.text(lines, margin, infoY + 4);
  }

  const signatureY = pageHeight - 55;
  if (signature?.dataUrl) {
    try {
      doc.addImage(signature.dataUrl, signature.kind, pageWidth - margin - 40, signatureY, 40, 18, undefined, "FAST");
    } catch {}
  }
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(...gray);
  doc.text(`For ${input.company.name}`, pageWidth - margin, signatureY - 4, { align: "right" });
  doc.setTextColor(0);
  doc.setFont(fontFamily, "bold");
  doc.text("Authorized Signatory", pageWidth - margin, signatureY + 22, { align: "right" });

  return doc.output("arraybuffer");
}

async function fetchImageAsDataUrl(url: string | undefined | null) {
  const u = String(url || "").trim();
  if (!u) return null;
  try {
    const res = await fetch(u);
    if (!res.ok) return null;
    const ct = String(res.headers.get("content-type") || "image/png").toLowerCase();
    const buf = new Uint8Array(await res.arrayBuffer());
    const b64 = Buffer.from(buf).toString("base64");
    const kind = ct.includes("jpeg") || ct.includes("jpg") ? "JPEG" : "PNG";
    return { dataUrl: `data:${ct};base64,${b64}`, kind } as { dataUrl: string; kind: "PNG" | "JPEG" };
  } catch {
    return null;
  }
}
