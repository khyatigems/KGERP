import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const FONTS = {
  notosansdisplay: {
    normal: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
    bold: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
    italic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf",
    bolditalic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf",
  }
};

type CachedFontData = { normal?: string; bold?: string; italic?: string; bolditalic?: string };
const cachedFontData = new Map<string, CachedFontData>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let result = "";
  for (let i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
  return result;
}

async function loadFont(doc: jsPDF, family: "notosansdisplay") {
  const fontDef = FONTS[family];
  if (!fontDef) return;

  let cached = cachedFontData.get(family);
  if (!cached) {
    const promises = [
      fetch(fontDef.normal).then((r) => (r.ok ? r.arrayBuffer() : null)),
      fetch(fontDef.bold).then((r) => (r.ok ? r.arrayBuffer() : null)),
    ];

    const [normBuf, boldBuf] = await Promise.all(promises);
    cached = {
      normal: normBuf ? arrayBufferToBinaryString(normBuf) : undefined,
      bold: boldBuf ? arrayBufferToBinaryString(boldBuf) : undefined,
    };
    cachedFontData.set(family, cached);
  }

  if (cached.normal) {
    doc.addFileToVFS(`${family}-Regular.ttf`, cached.normal);
    doc.addFont(`${family}-Regular.ttf`, family, "normal");
  }
  if (cached.bold) {
    doc.addFileToVFS(`${family}-Bold.ttf`, cached.bold);
    doc.addFont(`${family}-Bold.ttf`, family, "bold");
  }
}

export const exportToExcel = (
  data: Record<string, unknown>[],
  columns: { header: string; key: string }[],
  filename: string,
  _title: string = "Report",
  multiTable?: { title: string; rows: Record<string, unknown>[]; columns: { header: string; key: string }[] }[]
) => {
  const wb = XLSX.utils.book_new();

  if (multiTable) {
    for (let i = 0; i < multiTable.length; i++) {
      const t = multiTable[i];
      const excelData = t.rows.map((row) => {
        const newRow: Record<string, unknown> = {};
        t.columns.forEach((col) => {
          newRow[col.header] = row[col.key];
        });
        return newRow;
      });
      const ws = XLSX.utils.json_to_sheet(excelData);
      const safeSheetName = t.title.substring(0, 31).replace(/[\\/*?:\[\]]/g, "");
      XLSX.utils.book_append_sheet(wb, ws, safeSheetName || `Sheet${i + 1}`);
    }
  } else {
    const excelData = data.map((item) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col) => {
        row[col.header] = item[col.key];
      });
      return row;
    });
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, "Data");
  }

  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
  });
  saveAs(blob, `${filename}.xlsx`);
};

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

export const exportToPDF = async (
  data: Record<string, unknown>[],
  columns: { header: string; key: string }[],
  filename: string,
  title: string = "Report",
  multiTable?: { title: string; rows: Record<string, unknown>[]; columns: { header: string; key: string }[] }[]
) => {
  const doc = new jsPDF("p", "pt", "a4");
  await loadFont(doc, "notosansdisplay");

  doc.setFontSize(16);
  doc.text(title, 40, 40);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 40, 55);

  if (multiTable) {
    let currentY = 70;
    for (let i = 0; i < multiTable.length; i++) {
      const t = multiTable[i];
      if (i > 0 && currentY > 700) {
        doc.addPage();
        currentY = 40;
      }
      doc.setFontSize(14);
      doc.setTextColor(0);
      doc.text(t.title, 40, currentY);
      currentY += 10;
      
      const headers = t.columns.map((c) => c.header);
      const rows = t.rows.map((r) => t.columns.map((c) => r[c.key]));

      autoTable(doc, {
        head: [headers],
        body: rows as string[][],
        startY: currentY,
        styles: { fontSize: 8, cellPadding: 3, font: "notosansdisplay" },
        headStyles: { fillColor: [66, 66, 66], font: "notosansdisplay", fontStyle: "bold" },
        theme: "grid",
        margin: { top: 40 },
        didDrawPage: (data: unknown) => {
          // Footer
          const settings = (data as { settings: { margin: { left: number } } }).settings;
          const str = "Page " + (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
          doc.setFontSize(8);
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : (pageSize as { getHeight: () => number }).getHeight();
          doc.text(str, settings.margin.left, pageHeight - 20);
        },
      });
      
      currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 30;
    }
  } else {
    const headers = columns.map((c) => c.header);
    const rows = data.map((r) => columns.map((c) => r[c.key]));

    autoTable(doc, {
      head: [headers],
      body: rows as string[][],
      startY: 70,
      styles: { fontSize: 8, cellPadding: 3, font: "notosansdisplay" },
      headStyles: { fillColor: [66, 66, 66], font: "notosansdisplay", fontStyle: "bold" },
      theme: "grid",
      margin: { top: 40 },
      didDrawPage: (data: unknown) => {
        // Footer
        const settings = (data as { settings: { margin: { left: number } } }).settings;
        const str = "Page " + (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
        doc.setFontSize(8);
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : (pageSize as { getHeight: () => number }).getHeight();
        doc.text(str, settings.margin.left, pageHeight - 20);
      },
    });
  }

  doc.save(`${filename}.pdf`);
};
