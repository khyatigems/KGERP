import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

export interface RegisterEntry {
  date: Date;
  voucherNo: string;
  type: string;
  category: string;
  vendor: string;
  narration: string;
  amount: number;
}

export interface VoucherRegisterData {
  month: string;
  year: number;
  companyName: string;
  generatedBy: string;
  entries: RegisterEntry[];
  totalCount: number;
  totalAmount: number;
}

export async function generateMonthlyRegisterPDF(data: VoucherRegisterData) {
  const doc = new jsPDF({
    orientation: "landscape", // Registers are better in landscape
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

  // Table
  autoTable(doc, {
    startY: y,
    head: [["Date", "Voucher No", "Type", "Category", "Party/Vendor", "Narration", "Amount"]],
    body: data.entries.map(e => [
      format(new Date(e.date), "dd-MMM"),
      e.voucherNo,
      e.type,
      e.category,
      e.vendor,
      e.narration,
      formatCurrency(e.amount)
    ]),
    headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontStyle: "bold"
    },
    columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 35 },
        5: { cellWidth: "auto" },
        6: { cellWidth: 30, halign: "right" }
    },
    styles: {
        fontSize: 9,
        cellPadding: 3
    }
  });

  // @ts-expect-error - jspdf-autotable types
  y = doc.lastAutoTable.finalY + 10;

  // Footer Summary
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`Total Vouchers: ${data.totalCount}`, margin, y);
  doc.text(`Total Amount: ${formatCurrency(data.totalAmount)}`, margin + 60, y);

  // System Footer
  const footerY = doc.internal.pageSize.height - 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Generated on ${format(new Date(), "dd-MMM-yyyy HH:mm")} by ${data.generatedBy}`, margin, footerY);
  doc.text("Powered by KhyatiGems™ ERP", pageWidth - margin, footerY, { align: "right" });

  return doc.output("blob");
}
