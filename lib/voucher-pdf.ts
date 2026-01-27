import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface VoucherPDFData {
  voucherNumber: string;
  date: Date;
  type: string;
  amount: number;
  narration: string;
  category: string;
  vendorName?: string;
  paymentMode: string;
  createdBy: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
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

// Helper to format number safely for PDF (no unsupported symbols)
const formatAmount = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export async function generateVoucherPDF(data: VoucherPDFData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // --- 1. OUTER BORDER ---
  doc.setLineWidth(0.5);
  doc.setDrawColor(0);
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

  // --- 2. HEADER SECTION ---
  
  // Logo
  let logoHeight = 0;
  if (data.logoUrl) {
    try {
      const logoData = await loadImage(data.logoUrl);
      doc.addImage(logoData, "PNG", margin + 5, y + 5, 25, 25);
      logoHeight = 25;
    } catch (e) {
      console.warn("Logo load failed", e);
    }
  }

  // Company Details (Centered if no logo, or offset if logo exists)
  // Actually, standard design: Logo Left, Company Name Center/Left, Voucher Title Right.
  
  const headerTextX = margin + 35; 
  const maxNameWidth = pageWidth - margin - 60 - headerTextX - 5; // Available width before Title Box
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  
  // Wrap Company Name
  const splitName = doc.splitTextToSize(data.companyName.toUpperCase(), maxNameWidth);
  doc.text(splitName, headerTextX, y + 10);
  
  // Dynamic offset for address based on name height
  const nameHeight = splitName.length * 7; // Approx 7mm per line
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  
  const addressLines = [
    data.companyAddress
  ].filter(Boolean);
  
  doc.text(addressLines.join("\n"), headerTextX, y + 10 + nameHeight);
  
  // Voucher Title Box (Top Right)
  const title = data.type === "EXPENSE" ? "PAYMENT VOUCHER" : 
                data.type === "RECEIPT" ? "RECEIPT VOUCHER" : 
                data.type === "REVERSAL" ? "REVERSAL VOUCHER" : "JOURNAL VOUCHER";

  doc.setFillColor(240, 240, 240); // Light gray
  doc.rect(pageWidth - margin - 60, y + 5, 55, 10, "F"); // Background box
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth - margin - 32.5, y + 11.5, { align: "center" });

  // Voucher Meta Data (Below Title Box)
  y += 35;
  
  // Draw a horizontal line separating header
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 10;

  // --- 3. VOUCHER INFO GRID ---
  doc.setFontSize(10);
  
  const col1 = margin + 5;
  const col2 = pageWidth / 2 + 5;
  
  // Left Column: Voucher No, Date
  doc.setFont("helvetica", "bold");
  doc.text("Voucher No:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.voucherNumber, col1 + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(data.date), "dd-MMM-yyyy"), col2 + 15, y);
  
  y += 8;
  
  // Row 2: Type, Mode
  doc.setFont("helvetica", "bold");
  doc.text("Type:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.type, col1 + 25, y);
  
  doc.setFont("helvetica", "bold");
  doc.text("Mode:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.paymentMode, col2 + 15, y);

  y += 10;

  // --- 4. TABLE SECTION ---
  
  // Prepare Body Data
  // We will use a custom layout in the cell to make it look "beautiful"
  // Instead of autoTable purely, we can use it for structure.
  
  const particularsText = [
    `Account Category:  ${data.category}`,
    data.vendorName ? `Paid To:           ${data.vendorName}` : "",
    `\nNarration:\n${data.narration || "-"}`
  ].filter(Boolean).join("\n");

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Particulars", "Amount (INR)"]],
    body: [
      [
        particularsText,
        formatAmount(data.amount)
      ]
    ],
    theme: "grid", // Grid theme ensures borders are closed
    styles: {
      fontSize: 10,
      cellPadding: 6,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
    },
    headStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      halign: "center",
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    columnStyles: {
      0: { 
        cellWidth: "auto",
        valign: "top"
      },
      1: { 
        cellWidth: 40, 
        halign: "right", 
        fontStyle: "bold",
        valign: "top",
        fontSize: 12
      }
    },
    didDrawCell: (_data) => {
      // Add vertical lines manually if needed, but 'grid' or 'plain' with lineWidth works.
      // We used 'plain' with manual lineWidth, so borders should appear.
    }
  });

  // @ts-expect-error - jspdf-autotable types
  y = doc.lastAutoTable.finalY;

  // Fill the rest of the table height if it's too short (to look like a full voucher)
  // Optional: Draw a line at the bottom of the content if needed.
  
  y += 5;

  // --- 5. AMOUNT IN WORDS ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Amount (in words):", margin + 5, y + 5);
  doc.setFont("helvetica", "normal");
  // Wrap text if too long
  const words = `${convertNumberToWords(data.amount)}`;
  const splitWords = doc.splitTextToSize(words, contentWidth - 45);
  doc.text(splitWords, margin + 40, y + 5);

  // --- 6. SIGNATURES ---
  const footerY = pageHeight - margin - 30;
  
  // Draw line above signatures
  // doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  const sigBoxWidth = (contentWidth - 20) / 3;
  const sigY = footerY + 20;

  // Prepared By
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Prepared By", margin + 5, footerY);
  doc.setFont("helvetica", "bold");
  doc.text(data.createdBy, margin + 5, footerY + 5);
  doc.line(margin + 5, sigY, margin + 5 + sigBoxWidth, sigY);

  // Verified By
  doc.setFont("helvetica", "normal");
  doc.text("Verified By", margin + 10 + sigBoxWidth, footerY);
  doc.line(margin + 10 + sigBoxWidth, sigY, margin + 10 + (sigBoxWidth * 2), sigY);

  // Receiver
  doc.setFont("helvetica", "normal");
  doc.text("Receiver's Signature", margin + 15 + (sigBoxWidth * 2), footerY);
  doc.line(margin + 15 + (sigBoxWidth * 2), sigY, pageWidth - margin - 5, sigY);

  // --- 7. SYSTEM FOOTER ---
  const systemFooterY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by KhyatiGems™ ERP", pageWidth / 2, systemFooterY, { align: "center" });

  // --- WATERMARK ---
  if (data.type === "REVERSAL" || data.type === "CANCELLED") {
      doc.setTextColor(255, 200, 200);
      doc.setFontSize(50);
      doc.setFont("helvetica", "bold");
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
      doc.text("CANCELLED", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
  }

  return doc.output("blob");
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
  
  let words = "";
  const rupeesInt = parseInt(rupees);
  
  if (rupeesInt === 0) {
    words = "Zero Rupees";
  } else {
    words = convertToWords(rupeesInt) + " Rupees";
  }

  const paiseInt = parseInt(paise);
  if (paiseInt > 0) {
    words += " and " + convertToWords(paiseInt) + " Paise";
  }

  return words + " Only";
}
