import jsPDF from "jspdf";
import QRCode from "qrcode";

export interface LabelItem {
    id: string;
    sku: string;
    itemName: string;
    gemType: string;
    color: string;
    weightValue: number;
    weightUnit: string;
    weightRatti?: number | null;
    sellingPrice: number;
    pricingMode?: string; // PER_CARAT | FLAT
    sellingRatePerCarat?: number | null;
    priceWithChecksum?: string; // Pre-calculated encoded price
}

export interface LabelConfig {
    pageSize: "TAG" | "A4";
    rows: number;
    cols: number;
    marginTop: number;
    marginLeft: number;
    horizontalGap: number;
    verticalGap: number;
    labelWidth: number;
    labelHeight: number;
    showPrice: boolean;
    showEncodedPrice: boolean; // New toggle
    qrSize: number;
    fontSize: number;
}

export const DEFAULT_TAG_CONFIG: LabelConfig = {
    pageSize: "TAG",
    rows: 1,
    cols: 1,
    marginTop: 0,
    marginLeft: 0,
    horizontalGap: 0,
    verticalGap: 0,
    labelWidth: 50,
    labelHeight: 30,
    showPrice: false,
    showEncodedPrice: false,
    qrSize: 12,
    fontSize: 8
};

export const DEFAULT_A4_CONFIG: LabelConfig = {
    pageSize: "A4",
    rows: 9,
    cols: 4,
    marginTop: 10,
    marginLeft: 5,
    horizontalGap: 2,
    verticalGap: 2,
    labelWidth: 48,
    labelHeight: 28,
    showPrice: false,
    showEncodedPrice: false,
    qrSize: 10,
    fontSize: 7
};

export async function generateLabelPDF(items: LabelItem[], config: LabelConfig) {
    // 1. Create PDF
    const doc = new jsPDF({
        orientation: config.pageSize === "TAG" ? "landscape" : "portrait",
        unit: "mm",
        format: config.pageSize === "TAG" ? [config.labelHeight, config.labelWidth] : "a4"
    });

    // 2. Prepare QR Codes
    const qrCodes: Record<string, string> = {};
    const baseUrl = window.location.origin + "/preview/"; // Use origin for link
    
    for (const item of items) {
        if (!qrCodes[item.sku]) {
            try {
                // Generate QR linking to preview page
                qrCodes[item.sku] = await QRCode.toDataURL(baseUrl + item.sku, { 
                    margin: 0,
                    errorCorrectionLevel: 'M'
                });
            } catch (e) {
                console.error("QR Gen Error", e);
            }
        }
    }

    // 3. Render Labels
    let currentItemIndex = 0;
    
    // For TAG mode, we create a new page for each item (except the first which is created by default)
    // For A4 mode, we fill the grid
    
    if (config.pageSize === "TAG") {
        items.forEach((item, index) => {
            if (index > 0) doc.addPage([config.labelHeight, config.labelWidth], "landscape");
            renderLabel(doc, item, 0, 0, config, qrCodes[item.sku]);
        });
    } else {
        // A4 Grid
        const itemsPerPage = config.rows * config.cols;
        const totalPages = Math.ceil(items.length / itemsPerPage);

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) doc.addPage("a4", "portrait");

            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    if (currentItemIndex >= items.length) break;
                    
                    const item = items[currentItemIndex];
                    const x = config.marginLeft + (col * (config.labelWidth + config.horizontalGap));
                    const y = config.marginTop + (row * (config.labelHeight + config.verticalGap));
                    
                    // Draw border for debugging/cutting guide (optional, maybe make configurable)
                    doc.setDrawColor(200);
                    doc.setLineWidth(0.1);
                    doc.rect(x, y, config.labelWidth, config.labelHeight);

                    renderLabel(doc, item, x, y, config, qrCodes[item.sku]);
                    
                    currentItemIndex++;
                }
            }
        }
    }

    // 4. Return Blob URL
    return doc.output("bloburl");
}

function renderLabel(doc: jsPDF, item: LabelItem, x: number, y: number, config: LabelConfig, qrDataUrl: string) {
    const padding = 2; // Internal padding in mm
    const contentX = x + padding;
    const contentY = y + padding;
    // const contentWidth = config.labelWidth - (padding * 2);
    
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    
    // Item Name (Truncate if too long)
    doc.setFontSize(config.fontSize + 2);
    const name = item.itemName.length > 20 ? item.itemName.substring(0, 18) + "..." : item.itemName;
    doc.text(name, contentX, contentY + 3);

    // SKU
    doc.setFont("courier", "normal");
    doc.setFontSize(config.fontSize);
    doc.text(item.sku, contentX, contentY + 7);

    // QR Code (Top Right)
    if (qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", x + config.labelWidth - config.qrSize - 1, y + 1, config.qrSize, config.qrSize);
    }

    // Details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(config.fontSize - 1);
    let currentY = contentY + 12;
    const lineHeight = 3.5;

    doc.text(`${item.gemType} • ${item.color}`, contentX, currentY);
    currentY += lineHeight;
    
    let weightText = `${item.weightValue} ${item.weightUnit}`;
    if (item.weightRatti) weightText += ` (${item.weightRatti.toFixed(2)} Ratti)`;
    doc.text(weightText, contentX, currentY);
    currentY += lineHeight;

    if (config.showEncodedPrice && item.priceWithChecksum) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(config.fontSize + 1);
        doc.text(`Rs. ${item.priceWithChecksum}`, contentX, currentY);
    } else if (config.showPrice) {
        doc.setFont("helvetica", "bold");
        let priceText = "";
        if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat) {
             priceText = `Rs. ${item.sellingRatePerCarat.toLocaleString()}/ct`;
        } else {
             priceText = `Rs. ${item.sellingPrice.toLocaleString()}`;
        }
        doc.text(priceText, contentX, currentY);
    }

    // Footer Branding
    doc.setFontSize(config.fontSize - 3);
    doc.setTextColor(100);
    doc.text("KHYATI GEMS", x + (config.labelWidth / 2), y + config.labelHeight - 1, { align: "center" });
}
