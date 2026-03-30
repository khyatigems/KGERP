import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatInrCurrency } from "@/lib/number-formatting";
import { format } from "date-fns";
import { RegisterEntry, VoucherRegisterData, validateVoucherRegisterData } from "@/types/pdf-generation";

// Helper to ensure consistent date handling
const ensureDate = (date: Date | string | undefined | null): Date => {
  if (date instanceof Date) {
    return date;
  }
  if (typeof date === 'string') {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error(`Invalid date string: ${date}`);
    }
    return parsedDate;
  }
  throw new Error(`Invalid date type: ${typeof date}`);
};

export async function generateMonthlyRegisterPDF(data: VoucherRegisterData) {
  // Comprehensive input validation using validation function
  const validation = validateVoucherRegisterData(data);
  if (!validation.isValid) {
    const errorMessages = validation.errors.map(err => `${err.field}: ${err.message}`).join('; ');
    throw new Error(`Validation failed: ${errorMessages}`);
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 12; // Reduced margin for more space
  let y = margin;

  // Header with better spacing
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20); // Increased font size
  doc.text(data.companyName, pageWidth / 2, y, { align: "center" });
  
  y += 10;
  doc.setFontSize(16); // Increased font size
  doc.text(`Voucher Register – ${data.month} ${data.year}`, pageWidth / 2, y, { align: "center" });

  y += 12;

    // Helper function to calculate font size based on content length
    const calculateFontSize = (text: string, maxCellWidth: number, baseFontSize: number = 9): number => {
      if (!text || text.length <= 10) return baseFontSize;
      
      let fontSize = baseFontSize;
      
      // Simple approximation for font width calculation
      const avgCharWidth = fontSize * 0.6; // Approximate average character width
      while (fontSize > 6 && (text.length * avgCharWidth) > maxCellWidth) {
        fontSize -= 0.5;
      }
      
      return Math.max(fontSize, 6);
    };

  // Helper function to clean and format text
  const cleanText = (text: string): string => {
    if (!text || text === "-") return "-";
    return text.trim().replace(/\s+/g, ' ');
  };

  // Enhanced table with dynamic font sizing and better spacing
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Date", "Voucher No", "Type", "Category", "Party/Vendor", "Narration", "Debit (₹)", "Credit (₹)"]],
    body: data.entries.map(e => {
      const voucherNo = cleanText(e.voucherNo);
      const narration = cleanText(e.narration || "-");
      const vendor = cleanText(e.vendor || "-");
      
      return [
        format(ensureDate(e.date), "dd-MMM-yyyy"),
        voucherNo,
        e.type,
        e.category,
        vendor,
        narration,
        e.debit ? formatInrCurrency(e.debit) : "-",
        e.credit ? formatInrCurrency(e.credit) : "-"
      ];
    }),
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      fontSize: 10,
      cellPadding: 4
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center", fontSize: 9, cellPadding: 3 },
      1: { 
        cellWidth: 35, 
        halign: "center", 
        fontSize: 9, 
        cellPadding: 3
      },
      2: { cellWidth: 20, halign: "center", fontSize: 9, cellPadding: 3 },
      3: { cellWidth: 25, halign: "center", fontSize: 9, cellPadding: 3 },
      4: { cellWidth: 30, halign: "left", fontSize: 9, cellPadding: 3 },
      5: { cellWidth: "auto", halign: "left", fontSize: 9, cellPadding: 3 },
      6: { cellWidth: 30, halign: "right", fontStyle: "bold", fontSize: 9, cellPadding: 3 },
      7: { cellWidth: 30, halign: "right", fontStyle: "bold", fontSize: 9, cellPadding: 3 }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3, // Reduced padding to save space
      lineColor: [200, 200, 200],
      lineWidth: 0.1,
      overflow: 'linebreak' // Ensure text wraps properly
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
    },
    // Custom hook for dynamic font sizing
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.cell.raw) { // Voucher No column
        const text = String(data.cell.raw);
        const cellWidth = data.column.width;
        
        // Simple approximation for text width
        const avgCharWidth = 9 * 0.6; // Base font size * average character width
        if ((text.length * avgCharWidth) > cellWidth - 6) {
          const fontSize = calculateFontSize(text, cellWidth - 6, 9);
          doc.setFontSize(fontSize);
        }
      }
    }
  });

  // @ts-expect-error - jspdf-autotable types
  y = doc.lastAutoTable.finalY + 10;

  // Footer Summary with improved formatting
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  
  // Summary box
  doc.setDrawColor(200);
  doc.setLineWidth(0.2);
  doc.rect(margin, y - 5, pageWidth - (margin * 2), 25);
  
  doc.text(`Total Vouchers: ${data.totalCount}`, margin + 5, y + 5);
  doc.text(`Total Debit: ${formatInrCurrency(data.totalDebits || 0)}`, margin + 5, y + 12);
  doc.text(`Total Credit: ${formatInrCurrency(data.totalCredits || 0)}`, margin + 5, y + 19);
  
  doc.text(`Net Balance: ${formatInrCurrency((data.totalCredits || 0) - (data.totalDebits || 0))}`, pageWidth / 2, y + 5, { align: "center" });
  doc.text(`Grand Total: ${formatInrCurrency(data.totalAmount)}`, pageWidth - margin - 5, y + 5, { align: "right" });

  // System Footer
  const footerY = doc.internal.pageSize.height - 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), "dd-MMM-yyyy HH:mm")} by ${data.generatedBy}`, margin, footerY);
  doc.text("Powered by KhyatiGems™ ERP", pageWidth - margin, footerY, { align: "right" });

  return doc.output("blob");
}
