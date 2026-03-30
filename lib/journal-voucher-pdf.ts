import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export interface JournalLineData {
  accountName: string;
  accountCode: string;
  description?: string;
  debit: number;
  credit: number;
}

export interface JournalVoucherPDFData {
  id: string;
  date: Date;
  description: string;
  referenceType?: string | null;
  referenceId?: string | null;
  createdBy: string; // Name of the user who created it
  companyName: string;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  logoUrl?: string | null;
  lines: JournalLineData[];
  isReversed?: boolean; // New field to indicate if the entry is reversed
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

// Function to convert numbers to words (copied from voucher-pdf.ts)
function convertNumberToWords(amount: number): string {
  const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convertToWordsRecursive = (n: number): string => {
    if (n === 0) return "";
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + units[n % 10] : "");
    if (n < 1000) return units[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertToWordsRecursive(n % 100) : "");
    if (n < 100000) return convertToWordsRecursive(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertToWordsRecursive(n % 1000) : "");
    if (n < 10000000) return convertToWordsRecursive(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convertToWordsRecursive(n % 100000) : "");
    return convertToWordsRecursive(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convertToWordsRecursive(n % 10000000) : "");
  };

  const [rupees, paise] = amount.toFixed(2).split(".");
  
  let words = "";
  const rupeesInt = parseInt(rupees);
  
  if (rupeesInt === 0) {
    words = "Zero Rupees";
  } else {
    words = convertToWordsRecursive(rupeesInt) + " Rupees";
  }

  const paiseInt = parseInt(paise);
  if (paiseInt > 0) {
    words += " and " + convertToWordsRecursive(paiseInt) + " Paise";
  }

  return words + " Only";
}

export async function generateJournalVoucherPDF(data: JournalVoucherPDFData) {
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
  if (data.logoUrl) {
    try {
      const logoData = await loadImage(data.logoUrl);
      doc.addImage(logoData, "PNG", margin + 5, y + 5, 25, 25);
    } catch (e) {
      console.warn("Logo load failed", e);
    }
  }

  const headerTextX = margin + 35; 
  const maxNameWidth = pageWidth - margin - 60 - headerTextX - 5; 
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  
  const splitName = doc.splitTextToSize(data.companyName.toUpperCase(), maxNameWidth);
  doc.text(splitName, headerTextX, y + 10);
  
  const nameHeight = splitName.length * 7; 
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60);
  
  const addressLines = [
    data.companyAddress
  ].filter(Boolean);
  
  doc.text(addressLines.join("\n"), headerTextX, y + 10 + nameHeight);
  
  // Voucher Title Box (Top Right)
  const title = "JOURNAL VOUCHER";

  doc.setFillColor(240, 240, 240); // Light gray
  doc.rect(pageWidth - margin - 60, y + 5, 55, 10, "F"); // Background box
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(title, pageWidth - margin - 32.5, y + 11.5, { align: "center" });

  y += 35;
  
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
  doc.text(data.id.substring(0, 8).toUpperCase(), col1 + 25, y); // Using part of ID as voucher number
  
  doc.setFont("helvetica", "bold");
  doc.text("Date:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(data.date), "dd-MMM-yyyy"), col2 + 15, y);
  
  y += 8;
  
  // Row 2: Description, Created By
  doc.setFont("helvetica", "bold");
  doc.text("Description:", col1, y);
  doc.setFont("helvetica", "normal");
  doc.text(doc.splitTextToSize(data.description, contentWidth / 2 - 30), col1 + 25, y);

  doc.setFont("helvetica", "bold");
  doc.text("Created By:", col2, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.createdBy, col2 + 25, y);

  y += 10; // Adjust based on description height if multiline

  if (data.referenceType && data.referenceId) {
    doc.setFont("helvetica", "bold");
    doc.text("Reference:", col1, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.referenceType} - ${data.referenceId}`, col1 + 25, y);
    y += 8;
  }

  y += 5; // Extra spacing before table

  // --- 4. JOURNAL LINES TABLE ---
  const tableHeaders = [["Account", "Description", "Debit (INR)", "Credit (INR)"]];
  const tableBody = data.lines.map(line => [
    `${line.accountCode} - ${line.accountName}`,
    line.description || "-",
    line.debit > 0 ? formatAmount(line.debit) : "",
    line.credit > 0 ? formatAmount(line.credit) : "",
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: tableHeaders,
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
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
      lineColor: [0, 0, 0],
    },
    columnStyles: {
      0: { cellWidth: 40, valign: "top" }, // Account
      1: { cellWidth: "auto", valign: "top" }, // Description
      2: { cellWidth: 25, halign: "right", valign: "top" }, // Debit
      3: { cellWidth: 25, halign: "right", valign: "top" }, // Credit
    },
    didDrawPage: function (hookData) {
      // Add totals row
      if (hookData.pageNumber === doc.getNumberOfPages()) {
        const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

        const tableApi = hookData.table as unknown as {
          width?: number;
          columns?: Array<{ width?: number }>;
        };
        const descriptionWidth = Number(tableApi?.columns?.[1]?.width ?? 40);
        const combinedAccountWidth = 40 + descriptionWidth;
        const tableWidth = tableApi?.width;

        const lastAutoTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
        const totalsStartY = hookData.cursor?.y ?? lastAutoTable?.finalY ?? hookData.cursor?.y ?? margin;

        autoTable(doc, {
          startY: totalsStartY,
          margin: { left: margin, right: margin },
          body: [
            [
              { content: "TOTAL:", styles: { fontStyle: "bold", halign: "right" } },
              { content: formatAmount(totalDebit), styles: { fontStyle: "bold", halign: "right" } },
              { content: formatAmount(totalCredit), styles: { fontStyle: "bold", halign: "right" } }
            ]
          ],
          theme: "grid",
          styles: {
            fontSize: 9,
            cellPadding: 3,
            lineColor: [0, 0, 0],
            lineWidth: 0.1,
            textColor: [0, 0, 0],
          },
          columnStyles: {
            0: { cellWidth: combinedAccountWidth, valign: "top" }, // Account + Description
            1: { cellWidth: 25, halign: "right", valign: "top" }, // Debit
            2: { cellWidth: 25, halign: "right", valign: "top" }, // Credit
          },
          tableWidth: tableWidth,
        });

        // Amount in words
        const totalsAutoTable = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable;
        let currentY = (totalsAutoTable?.finalY ?? totalsStartY) + 5;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text("Amount (in words):", margin + 5, currentY);
        doc.setFont("helvetica", "normal");
        const totalAmount = Math.max(totalDebit, totalCredit); // Assuming balanced entry, take either
        const words = `${convertNumberToWords(totalAmount)}`;
        const splitWords = doc.splitTextToSize(words, contentWidth - 45);
        doc.text(splitWords, margin + 40, currentY);

        currentY += Math.max(splitWords.length * 5, 10); // Adjust Y based on words height

        // Signatures
        const footerY = pageHeight - margin - 30; // Position signatures from bottom
        currentY = Math.max(currentY, footerY); // Ensure signatures don't overlap with content

        const sigBoxWidth = (contentWidth - 20) / 3;
        const sigY = currentY + 20;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Prepared By", margin + 5, currentY);
        doc.setFont("helvetica", "bold");
        doc.text(data.createdBy, margin + 5, currentY + 5);
        doc.line(margin + 5, sigY, margin + 5 + sigBoxWidth, sigY);

        doc.setFont("helvetica", "normal");
        doc.text("Verified By", margin + 10 + sigBoxWidth, currentY);
        doc.line(margin + 10 + sigBoxWidth, sigY, margin + 10 + (sigBoxWidth * 2), sigY);

        doc.setFont("helvetica", "normal");
        doc.text("Approved By", margin + 15 + (sigBoxWidth * 2), currentY);
        doc.line(margin + 15 + (sigBoxWidth * 2), sigY, pageWidth - margin - 5, sigY);
      }
    }
  });

  // --- SYSTEM FOOTER ---
  const systemFooterY = pageHeight - margin - 5;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by KhyatiGems™ ERP", pageWidth / 2, systemFooterY, { align: "center" });

  // --- WATERMARK ---
  if (data.isReversed) {
      doc.setTextColor(255, 200, 200);
      doc.setFontSize(50);
      doc.setFont("helvetica", "bold");
      doc.saveGraphicsState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      doc.setGState(new (doc as any).GState({ opacity: 0.3 }));
      doc.text("REVERSED", pageWidth / 2, pageHeight / 2, { align: "center", angle: 45 });
      doc.restoreGraphicsState();
  }

  return doc.output("blob");
}
