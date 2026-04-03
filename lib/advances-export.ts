"use client";

import type { Advance } from "@/components/advances/advances-page";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function exportAdvancesToCSV(advances: Advance[]) {
  if (!advances.length) return;
  
  const data = advances.map(a => ({
    "Receipt No": `ADV-${a.id.slice(-6).toUpperCase()}`,
    "Customer": a.customerName,
    "Phone": a.customerMobile,
    "Amount": a.amount,
    "Remaining": a.remainingAmount,
    "Payment Mode": a.paymentMode,
    "Reference": a.paymentRef || "",
    "Notes": a.notes || "",
    "Date": new Date(a.createdAt).toLocaleDateString()
  }));

  const headers = Object.keys(data[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, '\""')}\"`;
    }
    return text;
  };
  
  const rows = data.map((row) => headers.map((h) => escape(row[h as keyof typeof row])).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `advances-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAdvancesToExcel(advances: Advance[]) {
  if (!advances.length) return;
  
  const data = advances.map(a => ({
    "Receipt No": `ADV-${a.id.slice(-6).toUpperCase()}`,
    "Customer": a.customerName,
    "Phone": a.customerMobile,
    "Amount": a.amount,
    "Remaining": a.remainingAmount,
    "Payment Mode": a.paymentMode,
    "Reference": a.paymentRef || "",
    "Notes": a.notes || "",
    "Date": new Date(a.createdAt).toLocaleDateString()
  }));

  const headers = Object.keys(data[0]);
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
      return `"${text.replace(/"/g, '\""')}\"`;
    }
    return text;
  };
  
  const rows = data.map((row) => headers.map((h) => escape(row[h as keyof typeof row])).join("\t"));
  const excelContent = [headers.join("\t"), ...rows].join("\n");
  
  const blob = new Blob([excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `advances-${new Date().toISOString().split("T")[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAdvancesToPDF(advances: Advance[]) {
  if (!advances.length) return;
  
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  
  // Title
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("Advances Report", 40, 40);
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 55);

  const columns = [
    { header: "Receipt No", key: "receiptNo" },
    { header: "Customer", key: "customer" },
    { header: "Phone", key: "phone" },
    { header: "Amount", key: "amount" },
    { header: "Remaining", key: "remaining" },
    { header: "Payment Mode", key: "paymentMode" },
    { header: "Reference", key: "reference" },
    { header: "Date", key: "date" }
  ];

  const data = advances.map(a => ({
    receiptNo: `ADV-${a.id.slice(-6).toUpperCase()}`,
    customer: a.customerName,
    phone: a.customerMobile,
    amount: `Rs. ${a.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    remaining: `Rs. ${a.remainingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
    paymentMode: a.paymentMode,
    reference: a.paymentRef || "",
    date: new Date(a.createdAt).toLocaleDateString("en-IN")
  }));

  const headers = columns.map((c) => c.header);
  const rows = data.map((r) => columns.map((c) => r[c.key as keyof typeof r]));

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 70,
    styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [66, 66, 66], fontStyle: "bold", textColor: 255 },
    theme: "grid",
    margin: { top: 40, left: 40, right: 40 },
    didDrawPage: (data: any) => {
      const str = "Page " + (doc.internal as any).pages.length;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 20);
    },
  });

  doc.save(`advances-${new Date().toISOString().split("T")[0]}.pdf`);
}
