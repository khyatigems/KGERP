import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { formatDate } from "@/lib/utils";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  company: {
    name: string;
    address: string;
    email: string;
    phone: string;
    gstin?: string;
    logoUrl?: string;
  };
  customer: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  items: {
    sku: string;
    description: string;
    quantity: number;
    unitPrice: number; // Base Price
    gstRate?: number;
    gstAmount?: number;
    total: number;
  }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: string;
  paymentStatus: string;
  terms?: string;
  notes?: string;
  signatureUrl?: string;
  upiQrData?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    ifsc: string;
    holder: string;
  };
}

const loadImage = (url: string): Promise<string> => {
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
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(`Failed to load image at ${url}`));
    img.src = url;
  });
};

const formatCurrencyPDF = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0.00";
    try {
        const fmt = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `Rs. ${fmt.format(amount)}`;
    } catch {
        return `Rs. ${amount.toFixed(2)}`;
    }
};

export async function generateInvoicePDF(data: InvoiceData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let y = margin;

  // Colors
  const primaryColor = [30, 41, 59] as [number, number, number]; // Slate 800
  const accentColor = [245, 247, 250] as [number, number, number]; // Light Gray
  const textColor = 33;

  // Pre-load images
  let logoDataUrl: string | null = null;
  let signatureDataUrl: string | null = null;

  if (data.company.logoUrl) {
    try {
      logoDataUrl = await loadImage(data.company.logoUrl);
    } catch (e) {
      console.warn("Logo load failed", e);
    }
  }

  if (data.signatureUrl) {
    try {
      signatureDataUrl = await loadImage(data.signatureUrl);
    } catch (e) {
      console.warn("Signature load failed", e);
    }
  }

  // --- HEADER ---
  // Background Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Logo (Left)
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, "PNG", margin, 5, 30, 30, undefined, 'FAST');
  }

  // Title (Right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", pageWidth - margin, 20, { align: "right" });

  // Invoice Details (Right, below title)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`#${data.invoiceNumber}`, pageWidth - margin, 28, { align: "right" });
  doc.text(`Date: ${formatDate(data.date)}`, pageWidth - margin, 34, { align: "right" });

  y = 50;

  // --- BILLING INFO ---
  // const colWidth = (pageWidth - margin * 2) / 2 - 5;
  
  // From (Company)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textColor);
  doc.text("Billed By:", margin, y);
  
  doc.setFont("helvetica", "bold"); // Company Name Bold
  doc.setFontSize(11);
  doc.text(data.company.name, margin, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const companyDetails = [
      data.company.address,
      data.company.phone ? `Phone: ${data.company.phone}` : "",
      data.company.email ? `Email: ${data.company.email}` : "",
      data.company.gstin ? `GSTIN: ${data.company.gstin}` : ""
  ].filter(Boolean).join("\n");
  
  doc.text(companyDetails, margin, y + 12);

  // To (Customer)
  const rightColX = pageWidth / 2 + 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(textColor);
  doc.text("Billed To:", rightColX, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(data.customer.name, rightColX, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  const customerDetails = [
      data.customer.address,
      data.customer.phone ? `Phone: ${data.customer.phone}` : "",
      data.customer.email ? `Email: ${data.customer.email}` : ""
  ].filter(Boolean).join("\n");
  doc.text(customerDetails, rightColX, y + 12);

  // Adjust Y based on content
  const maxLines = Math.max(companyDetails.split('\n').length, customerDetails.split('\n').length);
  y += 15 + (maxLines * 4) + 10;

  // --- ITEMS TABLE ---
  autoTable(doc, {
    startY: y,
    head: [["#", "Item Description", "Qty", "Base Price", "GST", "Total"]],
    body: data.items.map((item, i) => [
      i + 1,
      { content: `${item.sku}\n${item.description}`, styles: { fontStyle: "bold" } },
      item.quantity,
      formatCurrencyPDF(item.unitPrice),
      { content: `${formatCurrencyPDF(item.gstAmount || 0)}\n(${item.gstRate || 0}%)`, styles: { halign: "right" } },
      formatCurrencyPDF(item.total),
    ]),
    theme: "grid",
    headStyles: { 
        fillColor: primaryColor, 
        textColor: 255, 
        fontStyle: 'bold', 
        halign: 'center',
        cellPadding: 3
    },
    styles: { 
        fontSize: 9, 
        cellPadding: 4, 
        valign: 'middle', 
        overflow: 'linebreak',
        textColor: textColor,
        lineColor: [230, 230, 230],
        lineWidth: 0.1
    },
    alternateRowStyles: {
        fillColor: accentColor
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: "auto" },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 30, halign: "right" },
      5: { cellWidth: 35, halign: "right" },
    },
  });

  // @ts-expect-error - jspdf-autotable types mismatch
  y = doc.lastAutoTable.finalY + 10;

  // --- SUMMARY SECTION ---
  // We'll use a container for totals to make it pop
  const totalsWidth = 80;
  const totalsX = pageWidth - margin - totalsWidth;
  
  // Totals Box Background
  // doc.setFillColor(250, 250, 250);
  // doc.roundedRect(totalsX - 5, y - 5, totalsWidth + 5, 60, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(textColor);

  // Subtotal
  doc.text("Subtotal (Excl. Tax):", totalsX, y);
  doc.text(formatCurrencyPDF(data.subtotal), pageWidth - margin, y, { align: "right" });
  y += 6;

  // Discount
  if (data.discount > 0) {
    doc.text("Discount:", totalsX, y);
    doc.setTextColor(220, 38, 38); // Red
    doc.text(`-${formatCurrencyPDF(data.discount)}`, pageWidth - margin, y, { align: "right" });
    doc.setTextColor(textColor);
    y += 6;
  }

  // GST
  if (data.tax > 0) {
    doc.text("Total GST:", totalsX, y);
    doc.text(formatCurrencyPDF(data.tax), pageWidth - margin, y, { align: "right" });
    y += 6;
  }

  // Divider
  doc.setDrawColor(200);
  doc.line(totalsX, y, pageWidth - margin, y);
  y += 6;

  // Grand Total
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total Amount:", totalsX, y);
  doc.text(formatCurrencyPDF(data.total), pageWidth - margin, y, { align: "right" });
  y += 10;

  // Paid / Due
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  
  doc.setTextColor(22, 163, 74); // Green
  doc.text("Received:", totalsX, y);
  doc.text(formatCurrencyPDF(data.amountPaid), pageWidth - margin, y, { align: "right" });
  y += 6;

  doc.setTextColor(220, 38, 38); // Red
  doc.text("Balance Due:", totalsX, y);
  doc.text(formatCurrencyPDF(data.balanceDue), pageWidth - margin, y, { align: "right" });
  doc.setTextColor(textColor);

  // --- PAYMENT DETAILS & QR (Left Side) ---
  // Reset Y to align with totals, but on the left
  // @ts-expect-error - jspdf-autotable types mismatch
  const footerContentY = doc.lastAutoTable.finalY + 10;
  
  // Ensure we don't overlap with totals
  // const leftColWidth = pageWidth - margin * 2 - totalsWidth - 10;

  if (data.balanceDue > 0 && data.upiQrData) {
      // QR Code
      try {
          const qrUrl = await QRCode.toDataURL(data.upiQrData, { margin: 0 });
          doc.addImage(qrUrl, "PNG", margin, footerContentY, 25, 25);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text("Scan to Pay", margin + 2, footerContentY + 29);
      } catch (e) { console.error(e); }
  }

  if (data.bankDetails) {
      const bankX = margin + (data.balanceDue > 0 && data.upiQrData ? 35 : 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Bank Transfer Details:", bankX, footerContentY + 4);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text([
          `Bank: ${data.bankDetails.bankName}`,
          `A/C: ${data.bankDetails.accountNumber}`,
          `IFSC: ${data.bankDetails.ifsc}`,
          `Name: ${data.bankDetails.holder}`
      ], bankX, footerContentY + 9);
  }

  // --- FOOTER (Bottom of page) ---
  const footerY = pageHeight - 35;
  
  // Separator
  doc.setDrawColor(230);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Terms
  if (data.terms) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(textColor);
      doc.text("Terms & Conditions:", margin, footerY);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const termsLines = doc.splitTextToSize(data.terms, pageWidth - margin * 2 - 50);
      doc.text(termsLines, margin, footerY + 4);
  }

  // Signature
  if (signatureDataUrl) {
      doc.addImage(signatureDataUrl, "PNG", pageWidth - margin - 40, footerY - 15, 40, 20, undefined, 'FAST');
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(textColor);
      doc.text("Authorized Signatory", pageWidth - margin - 40, footerY + 8);
  } else {
      // Placeholder line if no signature
      doc.text("Authorized Signatory", pageWidth - margin - 40, footerY + 8);
  }

  return doc.output("blob");
}
