import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportToExcel(data: Record<string, unknown>[], fileName: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(blob, `${fileName}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

export function exportToCSV(data: Record<string, unknown>[], fileName: string) {
  if (!data.length) {
    saveAs(new Blob([""], { type: "text/csv;charset=utf-8;" }), `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
    return;
  }
  const headers = Object.keys(data[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, "\"\"")}"`;
    }
    return text;
  };
  const rows = data.map((row) => headers.map((h) => escape(row[h])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${fileName}_${new Date().toISOString().split("T")[0]}.csv`);
}

export function exportToPDF(
  columns: string[],
  data: (string | number)[][],
  fileName: string,
  title: string
) {
  const orientation = columns.length > 8 ? "landscape" : "portrait";
  const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
  doc.setFont("helvetica", "normal");

  // Add Title
  const marginLeft = 30;
  const marginRight = 30;
  const marginTop = 26;
  const titleY = marginTop + 10;
  const subtitleY = titleY + 16;
  const tableStartY = subtitleY + 18;

  doc.setTextColor(20);
  doc.setFontSize(18);
  doc.text(title, marginLeft, titleY);
  doc.setFontSize(11);
  doc.setTextColor(110);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, marginLeft, subtitleY);

  const availableWidth = doc.internal.pageSize.getWidth() - marginLeft - marginRight;
  const headerText = (header: string) => {
    if (orientation !== "landscape") return header;
    if (header.length <= 12) return header;
    return header.replace(/\s+/g, "\n");
  };
  const head = columns.map(headerText);
  const headerWeights = columns.map((c) => {
    const normalized = c.toLowerCase();
    if (normalized === "sku") return 1.2;
    if (normalized.includes("item")) return 1.6;
    if (normalized.includes("missing fields")) return 2.2;
    if (normalized.includes("missing count")) return 1.2;
    if (normalized.includes("certificate")) return 1.3;
    return 1;
  });
  const minWidths = columns.map((c) => {
    const normalized = c.toLowerCase();
    if (normalized === "sku") return 90;
    if (normalized.includes("item")) return 130;
    if (normalized.includes("missing fields")) return 160;
    return orientation === "landscape" ? 55 : 70;
  });
  const weightSum = headerWeights.reduce((a, b) => a + b, 0);
  let widths = headerWeights.map((w, idx) => Math.max(minWidths[idx], (availableWidth * w) / weightSum));
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  if (totalWidth > availableWidth) {
    const scale = availableWidth / totalWidth;
    widths = widths.map((w) => Math.max(38, w * scale));
  }
  const columnStyles = widths.reduce<Record<number, { cellWidth: number }>>((acc, w, idx) => {
    acc[idx] = { cellWidth: w };
    return acc;
  }, {});

  // Add Table
  const baseFontSize = orientation === "landscape" ? (columns.length >= 14 ? 7 : 8) : 10;
  autoTable(doc, {
    head: [head],
    body: data,
    startY: tableStartY,
    margin: { left: marginLeft, right: marginRight },
    theme: "grid",
    tableWidth: "auto",
    styles: {
      font: "helvetica",
      fontSize: baseFontSize,
      cellPadding: columns.length >= 14 ? 3 : 4,
      valign: "middle",
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: 255,
      fontStyle: "bold",
      halign: "center",
      valign: "middle",
    },
    bodyStyles: {
      textColor: 20,
      valign: "middle",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles,
  });

  doc.save(`${fileName}_${new Date().toISOString().split("T")[0]}.pdf`);
}
