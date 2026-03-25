import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

export async function generateCreditNotePDF(input: {
  company: { name: string; address?: string; email?: string; phone?: string; website?: string; gstin?: string };
  customer: { name: string; address?: string; phone?: string; email?: string };
  creditNoteNumber: string;
  invoiceNumber?: string;
  issueDate: Date;
  items: Array<{ description: string; qty: number; price: number }>;
  totalAmount: number;
  signatureUrl?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const gray = [100, 116, 139] as const;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(input.company.name, margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);
  const companyLines = [
    input.company.address || "",
    [input.company.email || "", input.company.phone || ""].filter(Boolean).join(" • "),
    input.company.website || "",
    input.company.gstin ? `GSTIN: ${input.company.gstin}` : "",
  ].filter(Boolean);
  if (companyLines.length) doc.text(companyLines, margin, 24);
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("CREDIT NOTE", pageWidth - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`CN No: ${input.creditNoteNumber}`, pageWidth - margin, 26, { align: "right" });
  doc.text(`Date: ${formatDateStr(input.issueDate)}`, pageWidth - margin, 32, { align: "right" });
  if (input.invoiceNumber) doc.text(`Ref Invoice: ${input.invoiceNumber}`, pageWidth - margin, 38, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, 42, pageWidth - margin, 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Bill To:", margin, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const customerLines = [
    input.customer.name,
    input.customer.address || "",
    [input.customer.phone || "", input.customer.email || ""].filter(Boolean).join(" • "),
  ].filter(Boolean);
  doc.text(customerLines, margin, 56);

  // QR code with CN number + customer + total
  try {
    const qrPayload = JSON.stringify({
      cn: input.creditNoteNumber,
      cust: input.customer.name,
      total: input.totalAmount,
    });
    const qrDataUrl = await QRCode.toDataURL(qrPayload, { width: 128 });
    doc.addImage(qrDataUrl, "PNG", pageWidth - margin - 28, 44, 28, 28);
  } catch {}

  const rows = input.items.map((i) => [
    String(i.description || ""),
    String(i.qty || 0),
    inr(i.price),
    inr((i.qty || 0) * i.price),
  ]);
  autoTable(doc, {
    head: [["Description", "Qty", "Rate", "Amount"]],
    body: rows,
    startY: 78,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: pageWidth - margin * 2 - 55 },
      1: { halign: "right", cellWidth: 12 },
      2: { halign: "right", cellWidth: 18 },
      3: { halign: "right", cellWidth: 25 },
    },
  });

  const lastY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 78;
  const totalsY = lastY + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total", pageWidth - margin - 40, totalsY);
  doc.text(inr(input.totalAmount), pageWidth - margin, totalsY, { align: "right" });

  if (input.signatureUrl) {
    try {
      const imgData = input.signatureUrl;
      doc.setFontSize(9);
      doc.text("Authorized Signatory", pageWidth - margin, totalsY + 20, { align: "right" });
      doc.addImage(imgData, "PNG", pageWidth - margin - 40, totalsY + 22, 40, 16);
    } catch {}
  }

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
