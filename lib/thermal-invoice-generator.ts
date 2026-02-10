import jsPDF from "jspdf";
import QRCode from "qrcode";
import { InvoiceData } from "./invoice-generator";
import { formatDate } from "./utils";

// 50mm width as per user requirement (Label Printer usage)
const PAPER_WIDTH = 50;
const MARGIN = 0.5;
const CONTENT_WIDTH = PAPER_WIDTH - (MARGIN * 2);

const formatCurrencyPDF = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "Rs. 0.00";
    try {
        const fmt = new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `Rs. ${fmt.format(amount)}`;
    } catch {
        return `Rs. ${amount?.toFixed(2) || "0.00"}`;
    }
};

interface JsPDFWithDash extends jsPDF {
    setLineDash(dashArray: number[], dashPhase?: number): jsPDF;
}

export async function generateThermalInvoicePDF(data: InvoiceData) {
    // 1. Calculate Estimated Height First
    // We need a dummy doc to calculate text wrapping height
    const dummyDoc = new jsPDF({ unit: "mm", format: [PAPER_WIDTH, 1000] });
    
    const fontSize = {
        title: 10,
        header: 9,
        normal: 8,
        small: 7,
        tiny: 6
    };
    const lineHeight = 3.5; // Reduced line height for compactness

    let estimatedHeight = MARGIN + 10; // Top margin + initial buffer

    // Helper to estimate text height
    const getTxtHeight = (text: string, size: number, bold: boolean = false) => {
        dummyDoc.setFontSize(size);
        dummyDoc.setFont("helvetica", bold ? "bold" : "normal");
        const lines = dummyDoc.splitTextToSize(text, CONTENT_WIDTH);
        return lines.length * (size * 0.35 + 1); // Approximation
    };

    // Header estimation
    estimatedHeight += getTxtHeight(data.company.name, fontSize.title, true);
    if (data.company.address) estimatedHeight += getTxtHeight(data.company.address, fontSize.tiny);
    if (data.company.phone) estimatedHeight += getTxtHeight(`Phone: ${data.company.phone}`, fontSize.tiny);
    if (data.company.gstin) estimatedHeight += getTxtHeight(`GSTIN: ${data.company.gstin}`, fontSize.tiny);
    estimatedHeight += 10; // Invoice details buffer

    // Customer
    estimatedHeight += 15;

    // Items
    data.items.forEach(item => {
        estimatedHeight += getTxtHeight(item.description, fontSize.normal, true); // Name
        // Details lines
        const detailLines = (item.sku ? 1 : 0) + 1; // +1 for price line
        estimatedHeight += detailLines * lineHeight; 
        estimatedHeight += 5; // Spacing
    });

    // Totals
    estimatedHeight += 25;

    // Footer
    if (data.amountPaid > 0) estimatedHeight += 10;
    if (data.bankDetails) estimatedHeight += 25;
    if (data.terms) estimatedHeight += getTxtHeight(data.terms, fontSize.tiny) + 5;
    if (data.notes) estimatedHeight += getTxtHeight(data.notes, fontSize.tiny) + 5;
    
    if (data.publicUrl || data.token) estimatedHeight += 35; // QR Code space

    estimatedHeight += 10; // Bottom margin

    // 2. Create Real Document
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [PAPER_WIDTH, Math.max(estimatedHeight, 40)] // Min height 40mm
    });

    let y = MARGIN + 2;
    const centerX = PAPER_WIDTH / 2;
    const leftX = MARGIN;
    const rightX = PAPER_WIDTH - MARGIN;

    // --- Drawing Helpers ---
    
    const drawCenterText = (text: string, size: number, bold: boolean = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
        doc.text(lines, centerX, y, { align: "center" });
        y += lines.length * (size * 0.35 + 1.2);
    };

    const drawLeftRight = (left: string, right: string, size: number = fontSize.normal, bold: boolean = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");
        
        // Check if left text is too long and needs wrapping
        // We reserve space for the right text
        const rightWidth = doc.getTextWidth(right);
        const maxLeftWidth = CONTENT_WIDTH - rightWidth - 2;
        
        const leftLines = doc.splitTextToSize(left, maxLeftWidth);
        
        doc.text(leftLines, leftX, y);
        doc.text(right, rightX, y, { align: "right" }); // Print right text on the first line level
        
        y += leftLines.length * (size * 0.35 + 1.2);
    };
    
    const drawWrappedText = (text: string, size: number, align: "left" | "center" = "left") => {
        doc.setFontSize(size);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
        doc.text(lines, align === "center" ? centerX : leftX, y, { align });
        y += lines.length * (size * 0.35 + 1.2);
    };

    const drawDivider = () => {
        y += 1;
        doc.setLineWidth(0.1);
        (doc as unknown as JsPDFWithDash).setLineDash([1, 1], 0); // Dashed line
        doc.line(leftX, y, rightX, y);
        (doc as unknown as JsPDFWithDash).setLineDash([], 0); // Reset
        y += 3;
    };

    // --- Content Rendering ---

    // 1. Company Header
    if (data.company.name) drawCenterText(data.company.name, fontSize.title, true);
    
    doc.setFontSize(fontSize.tiny);
    if (data.company.address) {
        drawCenterText(data.company.address, fontSize.tiny);
    }
    if (data.company.phone) drawCenterText(`Ph: ${data.company.phone}`, fontSize.tiny);
    if (data.company.gstin) drawCenterText(`GSTIN: ${data.company.gstin}`, fontSize.tiny);

    drawDivider();

    // 2. Invoice Meta
    drawCenterText("TAX INVOICE", fontSize.header, true);
    y += 1;
    drawLeftRight("Invoice No:", data.invoiceNumber, fontSize.small);
    drawLeftRight("Date:", formatDate(data.date), fontSize.small);

    drawDivider();

    // 3. Customer
    drawWrappedText("Bill To:", fontSize.small);
    drawWrappedText(data.customer.name, fontSize.normal);
    if (data.customer.phone) drawWrappedText(`Ph: ${data.customer.phone}`, fontSize.small);
    if (data.customer.address) drawWrappedText(data.customer.address, fontSize.tiny);

    drawDivider();

    // 4. Items Header
    doc.setFontSize(fontSize.small);
    doc.setFont("helvetica", "bold");
    doc.text("Item", leftX, y);
    doc.text("Amt", rightX, y, { align: "right" });
    y += 4;
    
    doc.setLineWidth(0.1);
    doc.line(leftX, y - 1, rightX, y - 1);
    y += 2;

    // 5. Items Loop
    data.items.forEach(item => {
        // Item Name & Price
        // We split description to get the main item name (first line usually)
        const descLines = item.description.split('\n');
        const itemName = descLines[0];
        
        // Draw Item Name (Bold) and Total Price
        drawLeftRight(itemName, formatCurrencyPDF(item.total), fontSize.normal, true);
        
        // Draw Details (SKU, Attributes) - Smaller font
        doc.setFontSize(fontSize.tiny);
        doc.setFont("helvetica", "normal");
        
        if (item.sku) {
            doc.text(`SKU: ${item.sku}`, leftX, y);
            y += 3;
        }

        // Remaining description lines (attributes)
        for (let i = 1; i < descLines.length; i++) {
            const line = descLines[i];
            const wrapped = doc.splitTextToSize(line, CONTENT_WIDTH);
            doc.text(wrapped, leftX, y);
            y += wrapped.length * 3;
        }
        
        y += 2; // Extra space between items
    });

    drawDivider();

    // 6. Totals
    const drawTotalRow = (label: string, value: number, bold: boolean = false) => {
        drawLeftRight(label, formatCurrencyPDF(value), fontSize.small, bold);
    };

    drawTotalRow("Subtotal:", data.subtotal);
    if (data.discount > 0) drawTotalRow("Discount:", -data.discount);
    if (data.tax > 0) drawTotalRow("GST (3%):", data.tax);
    
    y += 1;
    drawLeftRight("Total:", formatCurrencyPDF(data.total), fontSize.header, true);

    // 7. Payment Info
    if (data.amountPaid > 0) {
        y += 2;
        drawTotalRow("Paid:", data.amountPaid);
        drawTotalRow("Balance:", data.balanceDue, true);
    }

    drawDivider();

    // 8. Bank Details
    if (data.bankDetails) {
        drawCenterText("Bank Details", fontSize.small, true);
        drawWrappedText(`Bank: ${data.bankDetails.bankName}`, fontSize.tiny);
        drawWrappedText(`A/c: ${data.bankDetails.accountNumber}`, fontSize.tiny);
        drawWrappedText(`IFSC: ${data.bankDetails.ifsc}`, fontSize.tiny);
        y += 2;
    }

    // 9. Terms & Notes
    if (data.terms) {
        drawWrappedText("Terms & Conditions:", fontSize.tiny, "left");
        drawWrappedText(data.terms, fontSize.tiny, "left");
        y += 2;
    }

    if (data.notes) {
        drawWrappedText("Note:", fontSize.tiny, "left");
        drawWrappedText(data.notes, fontSize.tiny, "left");
        y += 2;
    }

    // 10. Footer
    y += 3;
    drawCenterText("Thank you for your business!", fontSize.small, true);
    
    // 11. QR Code
    const qrTargetUrl = (data.token && typeof window !== "undefined") 
        ? `${window.location.origin}/invoice/${data.token}`
        : data.publicUrl;

    if (qrTargetUrl) {
        y += 2;
        try {
            const qrDataUrl = await QRCode.toDataURL(qrTargetUrl, { margin: 0 });
            const qrSize = 25;
            const qrX = (PAPER_WIDTH - qrSize) / 2;
            doc.addImage(qrDataUrl, "PNG", qrX, y, qrSize, qrSize);
            y += qrSize + 2;
            drawCenterText("Scan to Download Invoice", fontSize.tiny);
        } catch (e) {
            console.error("Failed to generate QR", e);
        }
    }

    // Save
    doc.save(`Invoice-${data.invoiceNumber}-Thermal.pdf`);
}
