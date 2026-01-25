import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

// --- Types ---

interface ReportSummary {
  label: string;
  value: string | number;
}

interface InventoryReportItem {
  sku: string;
  itemName: string;
  internalName?: string | null;
  category: string;
  collection?: string | null;
  shape?: string | null;
  color?: string | null;
  vendorName?: string | null;
  carats: number;
  weightRatti?: number | null;
  purchasePricingMode?: string | null;
  purchaseRate?: number | null;
  sellingRate?: number | null;
  costPrice: number; // Total Purchase Amount
  sellingPrice: number; // Total Selling Amount
  status: string;
}

interface PurchaseReportItem {
  date: Date | string;
  vendorName?: string | null;
  itemName: string;
  invoiceNo?: string | null;
  weight: number;
  weightUnit?: string | null;
  purchaseRate: number;
  pricingMode?: string | null;
  totalAmount: number;
  notes?: string | null;
}

type ReportItem = InventoryReportItem | PurchaseReportItem;

interface ReportOptions {
  reportType: "inventory" | "purchase";
  vendorName: string;
  showVendorColumn?: boolean;
  dateRange?: { from?: Date; to?: Date };
  items: ReportItem[];
  summaryMetrics: ReportSummary[];
  generatedBy?: string;
}

// --- Helper Functions ---

const getReportTitle = (type: string) => {
  return type === "inventory" ? "Vendor Inventory Report" : "Vendor Purchase Report";
};

const getDateRangeString = (range?: { from?: Date; to?: Date }) => {
  if (!range?.from) return "All Time";
  const fromStr = format(range.from, "dd MMM yyyy");
  const toStr = range.to ? format(range.to, "dd MMM yyyy") : "Present";
  return `${fromStr} - ${toStr}`;
};

// --- PDF Generator ---

export const generatePDF = (options: ReportOptions) => {
  const doc = new jsPDF("l"); // Landscape for more columns
  const { reportType, vendorName, showVendorColumn, dateRange, items, summaryMetrics } = options;
  const title = getReportTitle(reportType);
  const dateStr = getDateRangeString(dateRange);
  const generatedDate = format(new Date(), "dd MMM yyyy HH:mm");

  // 1. Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("KHYATI GEMS", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text("Excellence in Gemstones", 14, 25);

  doc.setDrawColor(200, 200, 200);
  doc.line(14, 30, 280, 30); // Wider line for landscape

  // 2. Report Info
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 45);

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text(`Vendor: ${vendorName}`, 14, 52);
  doc.text(`Period: ${dateStr}`, 14, 57);
  doc.text(`Generated: ${generatedDate}`, 14, 62);

  // 3. Executive Summary (Box)
  const startY = 70;
  const boxHeight = 25;
  const boxWidth = 266; // Wider for landscape
  
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(220, 220, 220);
  doc.roundedRect(14, startY, boxWidth, boxHeight, 3, 3, "FD");

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("Executive Summary", 18, startY + 8);

  // Metrics
  doc.setFontSize(10);
  let metricX = 18;
  summaryMetrics.forEach((metric) => {
    doc.setTextColor(100, 100, 100);
    doc.text(metric.label, metricX, startY + 16);
    
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.text(String(metric.value), metricX, startY + 21);
    doc.setFont("helvetica", "normal");
    
    metricX += 60; // More spacing
  });

  // 4. Data Table
  let columns: string[] = [];
  let rows: (string | number)[][] = [];

  if (reportType === "inventory") {
    columns = [
      "SKU", "Item Name", "Category", "Shape", "Color", 
      "Weight (Ct)", "Pur. Rate", "Sell Rate", 
      "Total Pur.", "Total Sell", "Status"
    ];
    // Optional internal name if space permits or needed, but kept compact for PDF
    if (showVendorColumn) columns.unshift("Vendor");

    rows = (items as InventoryReportItem[]).map(item => {
      const row: (string | number)[] = [
        item.sku,
        item.itemName,
        item.category,
        item.shape || "-",
        item.color || "-",
        item.carats.toFixed(2),
        formatCurrency(item.purchaseRate || 0),
        formatCurrency(item.sellingRate || 0),
        formatCurrency(item.costPrice),
        formatCurrency(item.sellingPrice),
        item.status
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      return row;
    });
  } else {
    columns = [
      "Date", "Bill No", "Item Name", "Weight", "Unit", 
      "Rate", "Mode", "Total Amount", "Notes"
    ];
    if (showVendorColumn) columns.unshift("Vendor");

    rows = (items as PurchaseReportItem[]).map(item => {
      const row: (string | number)[] = [
        format(new Date(item.date), "dd/MM/yyyy"),
        item.invoiceNo || "-",
        item.itemName,
        item.weight.toFixed(2),
        item.weightUnit || "-",
        formatCurrency(item.purchaseRate),
        item.pricingMode || "-",
        formatCurrency(item.totalAmount),
        item.notes || "-"
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      return row;
    });
  }

  autoTable(doc, {
    startY: startY + boxHeight + 10,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 37, 36],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didDrawPage: (data) => {
      const pageCount = doc.getNumberOfPages();
      const pageCurrent = data.pageNumber;
      
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text("Confidential - For Internal Use Only", 14, doc.internal.pageSize.height - 10);
      doc.text(
        `Page ${pageCurrent} of ${pageCount}`, 
        doc.internal.pageSize.width - 25, 
        doc.internal.pageSize.height - 10
      );
    }
  });

  doc.save(`KhyatiGems_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
};

// --- Excel Generator ---

export const generateExcel = (options: ReportOptions) => {
  const { reportType, vendorName, showVendorColumn, dateRange, items, summaryMetrics } = options;
  const title = getReportTitle(reportType);
  const dateStr = getDateRangeString(dateRange);
  const generatedDate = format(new Date(), "yyyy-MM-dd HH:mm");

  const wb = XLSX.utils.book_new();

  // --- Sheet 1: Summary ---
  const summaryData = [
    ["KHYATI GEMS - REPORT SUMMARY"],
    [],
    ["Report Type", title],
    ["Vendor", vendorName],
    ["Period", dateStr],
    ["Generated On", generatedDate],
    [],
    ["KEY METRICS"],
    ...summaryMetrics.map(m => [m.label, m.value])
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // --- Sheet 2: Detailed Data ---
  const dataRows: (string | number)[][] = [];
  
  if (reportType === "inventory") {
    // Full Mandatory Columns
    const headers = [
      "SKU", "Item Name", "Internal Name", "Category", "Collection", 
      "Shape", "Color", "Weight (Ct)", "Weight (Ratti)", 
      "Pur. Mode", "Pur. Rate", "Sell Rate", 
      "Total Purchase Amt", "Total Sell Amt", "Status"
    ];
    if (showVendorColumn) headers.unshift("Vendor");
    dataRows.push(headers);

    (items as InventoryReportItem[]).forEach(item => {
      const row: (string | number)[] = [
        item.sku,
        item.itemName,
        item.internalName || "-",
        item.category,
        item.collection || "-",
        item.shape || "-",
        item.color || "-",
        item.carats,
        item.weightRatti || "-",
        item.purchasePricingMode || "-",
        item.purchaseRate || 0,
        item.sellingRate || 0,
        item.costPrice,
        item.sellingPrice,
        item.status
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      dataRows.push(row);
    });
  } else {
    const headers = [
      "Date", "Invoice / Bill No", "Item Name", "Quantity / Weight", "Unit", 
      "Purchase Rate", "Pricing Mode", "Total Purchase Amount", "Remarks / Notes"
    ];
    if (showVendorColumn) headers.unshift("Vendor");
    dataRows.push(headers);

    (items as PurchaseReportItem[]).forEach(item => {
      const row: (string | number)[] = [
        format(new Date(item.date), "yyyy-MM-dd"),
        item.invoiceNo || "-",
        item.itemName,
        item.weight,
        item.weightUnit || "-",
        item.purchaseRate,
        item.pricingMode || "-",
        item.totalAmount,
        item.notes || "-"
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      dataRows.push(row);
    });
  }

  const wsData = XLSX.utils.aoa_to_sheet(dataRows);
  XLSX.utils.book_append_sheet(wb, wsData, "Detailed Data");

  // Save
  XLSX.writeFile(wb, `KhyatiGems_${reportType}_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
};
