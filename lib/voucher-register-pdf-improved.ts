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
  const margin = 15;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.companyName, pageWidth / 2, y, { align: "center" });
  
  y += 8;
  doc.setFontSize(14);
  doc.text(`Voucher Register – ${data.month} ${data.year}`, pageWidth / 2, y, { align: "center" });

  y += 10;

  // Enhanced table with Debit/Credit columns
  autoTable(doc, {
    startY: y,
    head: [["Date", "Voucher No", "Type", "Category", "Party/Vendor", "Narration", "Debit (₹)", "Credit (₹)"]],
    body: data.entries.map(e => [
      format(ensureDate(e.date), "dd-MMM-yyyy"),
      e.voucherNo,
      e.type,
      e.category,
      e.vendor || "-",
      e.narration || "-",
      e.debit ? formatInrCurrency(e.debit) : "-",
      e.credit ? formatInrCurrency(e.credit) : "-"
    ]),
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontStyle: "bold",
      halign: "center"
    },
    columnStyles: {
      0: { cellWidth: 25, halign: "center" },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 20, halign: "center" },
      3: { cellWidth: 25, halign: "center" },
      4: { cellWidth: 30, halign: "left" },
      5: { cellWidth: "auto", halign: "left" },
      6: { cellWidth: 30, halign: "right", fontStyle: "bold" },
      7: { cellWidth: 30, halign: "right", fontStyle: "bold" }
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [200, 200, 200],
      lineWidth: 0.1
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250]
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
