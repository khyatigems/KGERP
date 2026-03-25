import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generateCreditNotePDF(input: {
  company: { name: string; gstin?: string };
  customer: { name: string };
  creditNoteNumber: string;
  invoiceNumber?: string;
  issueDate: Date;
  items: Array<{ description: string; qty: number; price: number }>;
  totalAmount: number;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(input.company.name, 15, 20);
  doc.setFontSize(11);
  doc.text(`Credit Note: ${input.creditNoteNumber}`, 150, 20, { align: "right" });
  if (input.invoiceNumber) doc.text(`Ref Invoice: ${input.invoiceNumber}`, 150, 26, { align: "right" });
  doc.setFont("helvetica", "normal");
  if (input.company.gstin) doc.text(`GSTIN: ${input.company.gstin}`, 15, 26);
  doc.text(`Customer: ${input.customer.name}`, 15, 32);
  doc.text(`Issue Date: ${formatDateStr(input.issueDate)}`, 15, 38);

  const rows = input.items.map((i) => [i.description, i.qty, inr(i.price), inr(i.qty * i.price)]);
  autoTable(doc, {
    head: [["Description", "Qty", "Price", "Amount"]],
    body: rows,
    startY: 44,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 44;
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${inr(input.totalAmount)}`, 15, lastY + 10);

  return doc.output("arraybuffer");
}

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function formatDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${da}-${m}-${y}`;
}
