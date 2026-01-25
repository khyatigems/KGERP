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
  carats: number;
  weightRatti?: string | null;
  color?: string | null;
  costPrice: number;
  sellingPrice: number;
  status: string;
  location?: string | null;
  dimensions?: string | null;
  dimensionsMm?: string | null;
  vendorName?: string | null;
}

interface PurchaseReportItem {
  date: Date | string;
  invoiceNo: string;
  itemName: string;
  weight: number;
  shape?: string | null;
  category: string;
  purchasePrice: number;
  totalAmount: number;
  vendorName?: string | null;
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
  return type === "inventory" ? "Vendor Inventory Level Report" : "Vendor Purchase Point Report";
};

const getDateRangeString = (range?: { from?: Date; to?: Date }) => {
  if (!range?.from) return "All Time";
  const fromStr = format(range.from, "dd MMM yyyy");
  const toStr = range.to ? format(range.to, "dd MMM yyyy") : "Present";
  return `${fromStr} - ${toStr}`;
};

// --- PDF Generator ---

export const generatePDF = (options: ReportOptions) => {
  const doc = new jsPDF();
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
  doc.line(14, 30, 196, 30);

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
  const boxWidth = 182;
  
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
    
    metricX += 50;
  });

  // 4. Data Table
  let columns: string[] = [];
  let rows: (string | number)[][] = [];

  if (reportType === "inventory") {
    columns = ["SKU", "Item Name", "Carats", "Ratti", "Color", "Cost", "Sell", "Status"];
    if (showVendorColumn) columns.unshift("Vendor");

    rows = (items as InventoryReportItem[]).map(item => {
      const row: (string | number)[] = [
        item.sku,
        item.itemName,
        item.carats,
        item.weightRatti || "-",
        item.color || "-",
        formatCurrency(item.costPrice),
        formatCurrency(item.sellingPrice),
        item.status
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      return row;
    });
  } else {
    columns = ["Date", "Invoice #", "Item Name", "Weight", "Shape", "Category", "Cost", "Total"];
    if (showVendorColumn) columns.unshift("Vendor");

    rows = (items as PurchaseReportItem[]).map(item => {
      const row: (string | number)[] = [
        format(new Date(item.date), "dd/MM/yyyy"),
        item.invoiceNo,
        item.itemName,
        item.weight,
        item.shape || "-",
        item.category,
        formatCurrency(item.purchasePrice),
        formatCurrency(item.totalAmount)
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
      fillColor: [41, 37, 36], // Dark gray/black
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [250, 250, 250],
    },
    didDrawPage: (data) => {
      // Footer
      const pageCount = doc.getNumberOfPages(); // Use getNumberOfPages() instead of internal.pages.length - 1
      const pageCurrent = data.pageNumber; // data.pageNumber is 1-based index
      
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
  
  // Basic Styling for Summary (Column Widths)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 40 }];
  
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

  // --- Sheet 2: Detailed Data ---
  const dataRows: (string | number)[][] = [];
  
  if (reportType === "inventory") {
    // Header Row
    const headers = ["SKU", "Item Name", "Carats", "Ratti", "Color", "Cost Price", "Selling Price", "Status", "Location", "Dimensions"];
    if (showVendorColumn) headers.unshift("Vendor");
    dataRows.push(headers);

    // Data Rows
    (items as InventoryReportItem[]).forEach(item => {
      const row: (string | number)[] = [
        item.sku,
        item.itemName,
        item.carats,
        item.weightRatti || "-",
        item.color || "-",
        item.costPrice, // Keep as number for Excel math
        item.sellingPrice,
        item.status,
        item.location || "-",
        item.dimensions || item.dimensionsMm || "-"
      ];
      if (showVendorColumn) row.unshift(item.vendorName || "-");
      dataRows.push(row);
    });
  } else {
    const headers = ["Date", "Invoice #", "Item Name", "Weight", "Shape", "Category", "Cost Price", "Total Amount"];
    if (showVendorColumn) headers.unshift("Vendor");
    dataRows.push(headers);

    (items as PurchaseReportItem[]).forEach(item => {
      const row: (string | number)[] = [
        format(new Date(item.date), "yyyy-MM-dd"), // ISO format for Excel dates
        item.invoiceNo,
        item.itemName,
        item.weight,
        item.shape || "-",
        item.category,
        item.purchasePrice,
        item.totalAmount
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
