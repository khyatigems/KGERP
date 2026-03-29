import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatInrCurrency } from "@/lib/number-formatting";

export async function generateCustomerStatementPDF(input: {
  company: { name: string; address?: string; gstin?: string };
  customer: { name: string; address?: string };
  period: { from?: Date | null; to?: Date | null };
  rows: Array<{ invoice: string; invoiceDate?: Date | null; dueDate?: Date | null; bucket: string; amount: number; paid: number; balance: number }>;
  totalDue: number;
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.company.name, 15, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (input.company.address) doc.text(input.company.address, 15, 26);
  if (input.company.gstin) doc.text(`GSTIN: ${input.company.gstin}`, 15, 31);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Customer Statement", 150, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  const periodStr = [
    input.period.from ? `From: ${formatDateStr(input.period.from)}` : null,
    input.period.to ? `To: ${formatDateStr(input.period.to)}` : null,
  ].filter(Boolean).join(" ");
  doc.text(periodStr || "", 150, 26, { align: "right" });

  doc.setFontSize(11);
  doc.text(input.customer.name, 15, 40);
  doc.setFontSize(10);
  if (input.customer.address) doc.text(input.customer.address, 15, 46);

  const tableRows = input.rows.map((r) => [
    r.invoice,
    r.invoiceDate ? formatDateStr(r.invoiceDate) : "-",
    r.dueDate ? formatDateStr(r.dueDate) : "-",
    r.bucket,
    inr(r.amount),
    inr(r.paid),
    inr(r.balance),
  ]);

  autoTable(doc, {
    head: [["Invoice", "Invoice Date", "Due Date", "Ageing", "Amount", "Paid", "Balance"]],
    body: tableRows,
    startY: 54,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
    theme: "striped",
  });

  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 54;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Due: ${inr(input.totalDue)}`, 15, lastY + 10);

  return doc.output("arraybuffer");
}

function formatDateStr(d: Date | string) {
  const dd = typeof d === "string" ? new Date(d) : d;
  const y = dd.getFullYear();
  const m = String(dd.getMonth() + 1).padStart(2, "0");
  const da = String(dd.getDate()).padStart(2, "0");
  return `${da}-${m}-${y}`;
}

function inr(n: number) {
  return formatInrCurrency(n);
}
