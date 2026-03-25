import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "@/lib/utils";
import { sanitizeNumberText } from "@/lib/number-formatting";
import { Buffer } from "buffer";

const FONTS = {
  notoSansDisplay: {
    family: "NotoSansDisplay",
    regular: "https://fonts.gstatic.com/s/notosans/v35/o-0IIpQlx3QUlC5A4PNr4ARC.woff2",
    bold: "https://fonts.gstatic.com/s/notosans/v35/o-0NIpQlx3QUlC5A4PNjXhFV.woff2",
  },
  poppins: {
    family: "Poppins",
    regular: "https://fonts.gstatic.com/s/poppins/v21/pxiEyp8kv8JHgFVrJJfedw.woff2",
    bold: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLCz7Z1xlFQ.woff2",
  },
};

let fontsLoaded = false;

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
  return result;
}

async function loadFont(doc: jsPDF, url: string, vfsName: string, fontName: string, fontStyle: "normal" | "bold") {
  const res = await fetch(url);
  if (!res.ok) return;
  const buffer = await res.arrayBuffer();
  doc.addFileToVFS(vfsName, arrayBufferToBinaryString(buffer));
  doc.addFont(vfsName, fontName, fontStyle);
}

async function ensureFonts(doc: jsPDF) {
  if (fontsLoaded) return;
  await Promise.all([
    loadFont(doc, FONTS.notoSansDisplay.regular, "NotoSansDisplay-Regular.woff2", FONTS.notoSansDisplay.family, "normal"),
    loadFont(doc, FONTS.notoSansDisplay.bold, "NotoSansDisplay-Bold.woff2", FONTS.notoSansDisplay.family, "bold"),
    loadFont(doc, FONTS.poppins.regular, "Poppins-Regular.woff2", FONTS.poppins.family, "normal"),
    loadFont(doc, FONTS.poppins.bold, "Poppins-Bold.woff2", FONTS.poppins.family, "bold"),
  ]);
  fontsLoaded = true;
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
  await ensureFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 11;
  const blue = [37, 99, 235] as [number, number, number];
  const gray = [100, 116, 139] as [number, number, number];

  doc.setCharSpace(0);

  const logo = await fetchImageAsDataUrl(input.company.logoUrl);
  const signature = await fetchImageAsDataUrl(input.signatureUrl);

  const fontFamily = FONTS.notoSansDisplay.family;
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

  const headerY = margin + 2;
  let y = headerY;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(18);
  doc.text(input.company.name, margin, y);

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const companyLines = [
    input.company.address || "",
    input.company.email ? `Email: ${input.company.email}` : "",
    input.company.phone ? `Mobile: ${input.company.phone}` : "",
    input.company.website ? input.company.website : "",
    input.company.gstin ? `GSTIN: ${input.company.gstin}` : "",
  ].filter(Boolean);
  doc.text(companyLines, margin, y + 6);
  doc.setTextColor(0);

  if (logo?.dataUrl) {
    try {
      doc.addImage(logo.dataUrl, logo.kind, pageWidth - margin - 28, margin, 28, 28, undefined, "FAST");
    } catch {}
  }

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(22);
  doc.text("CREDIT NOTE", pageWidth - margin, y + 2, { align: "right" });

  doc.setFont(fontFamily, "normal");
  doc.setFontSize(10);
  const metaX = pageWidth - margin;
  doc.text(`CN No: ${input.creditNoteNumber}`, metaX, y + 10, { align: "right" });
  doc.text(`Date: ${formatDate(input.issueDate)}`, metaX, y + 16, { align: "right" });
  const expiry = input.expiryDate ? formatDate(input.expiryDate) : "";
  if (expiry) doc.text(`Expiry Date: ${expiry}`, metaX, y + 22, { align: "right" });
  if (input.invoiceNumber) doc.text(`Ref Invoice: ${input.invoiceNumber}`, metaX, y + 28, { align: "right" });

  y += 36;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.text("Customer Details:", margin, y);
  y += 4;

  doc.setFont(fontFamily, "normal");
  const customerLines = [
    input.customer.customerCode ? `Cust ID : ${input.customer.customerCode}` : "",
    input.customer.name,
    input.customer.phone ? `Ph: ${input.customer.phone}` : "",
    input.customer.address || "",
  ].filter(Boolean).join("\n");
  const wrappedCustomer = doc.splitTextToSize(customerLines, pageWidth - margin * 2);
  doc.text(wrappedCustomer, margin, y);
  y += wrappedCustomer.length * 4 + 4;

  doc.setFont(fontFamily, "bold");
  doc.setTextColor(...blue);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setTextColor(0);
  y += 4;

  const rows = input.items.map((i, idx) => [
    String(idx + 1),
    String(i.description || ""),
    String(i.qty || 0),
    formatCurrencyPDF(i.price),
    formatCurrencyPDF((i.qty || 0) * i.price),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Item", "Qty", "Rate / Item", "Amount"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      2: { cellWidth: 12, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
    },
  });

  const afterTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
  let totalsY = afterTableY + 8;
  const totalsX = pageWidth - margin - 68;

  doc.setFont(fontFamily, "bold");
  doc.setFontSize(10);
  doc.text("Taxable Amount", totalsX, totalsY);
  doc.text(formatCurrencyPDF(input.taxableAmount || 0), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 5;

  if ((input.cgst || 0) > 0) {
    doc.setFont(fontFamily, "normal");
    doc.text("CGST", totalsX, totalsY);
    doc.text(formatCurrencyPDF(input.cgst || 0), pageWidth - margin, totalsY, { align: "right" });
    totalsY += 5;
  }
  if ((input.sgst || 0) > 0) {
    doc.text("SGST", totalsX, totalsY);
    doc.text(formatCurrencyPDF(input.sgst || 0), pageWidth - margin, totalsY, { align: "right" });
    totalsY += 5;
  }
  if ((input.igst || 0) > 0) {
    doc.text("IGST", totalsX, totalsY);
    doc.text(formatCurrencyPDF(input.igst || 0), pageWidth - margin, totalsY, { align: "right" });
    totalsY += 5;
  }

  doc.setFont(fontFamily, "bold");
  doc.text("Total Tax", totalsX, totalsY);
  doc.text(formatCurrencyPDF(input.totalTax || 0), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 6;

  doc.setFontSize(11);
  doc.text("Credit Note Amount", totalsX, totalsY);
  doc.text(formatCurrencyPDF(input.totalAmount), pageWidth - margin, totalsY, { align: "right" });
  totalsY += 6;

  doc.setFontSize(10);
  doc.text("Available Balance", totalsX, totalsY);
  doc.text(formatCurrencyPDF(input.balanceAmount ?? input.totalAmount), pageWidth - margin, totalsY, { align: "right" });

  const infoY = Math.max(totalsY + 8, afterTableY + 18);
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
    doc.setFontSize(9);
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
