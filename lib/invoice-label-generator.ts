import jsPDF from "jspdf";
import QRCode from "qrcode";
import { formatDate, formatCurrency } from "@/lib/utils";

export interface InvoiceLabelData {
    invoiceNumber: string;
    customerName: string;
    date: Date;
    totalAmount: number;
    itemCount: number;
    invoiceUrl: string;
}

export const THERMAL_LABEL_CONFIG = {
    width: 50, // mm
    height: 27.5, // mm (25mm label + ~2.5mm gap)
    margin: 2, // mm
};

export async function generateInvoiceLabelPDF(data: InvoiceLabelData) {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [THERMAL_LABEL_CONFIG.height, THERMAL_LABEL_CONFIG.width] // jsPDF takes [height, width] for some reason or [width, height]? Usually [w, h] but orientation matters.
        // Actually for custom size, it's [width, height]. 
        // Landscape means width > height.
    });

    const { width, height, margin } = THERMAL_LABEL_CONFIG;
    
    // Layout constants
    const qrSize = 16; // 16mm square for QR code
    const qrX = width - margin - qrSize;
    const qrY = (height - qrSize) / 2;
    const textMaxWidth = qrX - margin - 2; // Available width for text

    // 1. QR Code (Right Side)
    try {
        const qrDataUrl = await QRCode.toDataURL(data.invoiceUrl, { margin: 0 });
        doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch (e) {
        console.error("QR Gen failed", e);
    }

    let currentY = margin + 3;

    // 2. Company Name
    doc.setFontSize(6);
    doc.setFont("helvetica", "bold");
    doc.text("KhyatiGems", margin, currentY);
    currentY += 4;

    // 3. Invoice Number
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(data.invoiceNumber, margin, currentY);
    currentY += 4;

    // 4. Customer Name (Truncated)
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    let customerName = data.customerName || "Walk-in";
    if (doc.getTextWidth(customerName) > textMaxWidth) {
        while (doc.getTextWidth(customerName + "...") > textMaxWidth && customerName.length > 0) {
            customerName = customerName.slice(0, -1);
        }
        customerName += "...";
    }
    doc.text(customerName, margin, currentY);
    currentY += 4;

    // 5. Date & Items
    doc.setFontSize(6);
    doc.setFont("helvetica", "normal");
    const dateStr = formatDate(data.date);
    const itemStr = `${data.itemCount} Item${data.itemCount !== 1 ? 's' : ''}`;
    doc.text(`${dateStr} | ${itemStr}`, margin, currentY);
    currentY += 4;

    // 6. Total Amount
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const amountStr = formatCurrency(data.totalAmount);
    doc.text(amountStr, margin, currentY);

    return doc.output("bloburl");
}
