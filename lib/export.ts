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

export function exportToPDF(
  columns: string[],
  data: (string | number)[][],
  fileName: string,
  title: string
) {
  const doc = new jsPDF();

  // Add Title
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add Table
  autoTable(doc, {
    head: [columns],
    body: data,
    startY: 40,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66] },
  });

  doc.save(`${fileName}_${new Date().toISOString().split("T")[0]}.pdf`);
}
