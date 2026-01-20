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
    shape?: string | null;
    dimensions?: string | null;
    stockLocation?: string | null;
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
    selectedFields: string[];
}

export const DEFAULT_FIELDS = [
    "itemName",
    "sku",
    "qrCode",
    "gemType",
    "color",
    "shape",
    "dimensions",
    "weight",
    "stockLocation",
    "price",
    "companyName"
];

export const DEFAULT_TAG_CONFIG: LabelConfig = {
    pageSize: "TAG",
    rows: 1,
    cols: 1,
    marginTop: 0,
    marginLeft: 0,
    horizontalGap: 0,
    verticalGap: 0,
    labelWidth: 40,
    labelHeight: 25,
    showPrice: false,
    showEncodedPrice: false,
    qrSize: 10,
    fontSize: 7,
    selectedFields: DEFAULT_FIELDS
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
    fontSize: 7,
    selectedFields: DEFAULT_FIELDS
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
    const padding = 1.5; // Tighter padding
    const contentX = x + padding;
    const contentY = y + padding;
    
    // Safety check for selectedFields
    const fields = config.selectedFields || DEFAULT_FIELDS;
    
    doc.setTextColor(0);
    
    let currentY = contentY + 2.5; // Start Y position
    const lineHeight = 2.8; // Compact line height

    // 1. QR Code (Top Right)
    if (fields.includes("qrCode") && qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", x + config.labelWidth - config.qrSize - 1, y + 1, config.qrSize, config.qrSize);
    }

    // 2. Item Name
    if (fields.includes("itemName")) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(config.fontSize + 2);
        // Truncate if QR is present to avoid overlap?
        // Simple truncation for now
        const name = item.itemName.length > 18 ? item.itemName.substring(0, 16) + "..." : item.itemName;
        doc.text(name, contentX, currentY);
        currentY += lineHeight + 0.2;
    }

    // 3. SKU
    if (fields.includes("sku")) {
        doc.setFont("courier", "normal");
        doc.setFontSize(config.fontSize);
        doc.text(item.sku, contentX, currentY);
        currentY += lineHeight + 0.5; // Extra gap before details
    }

    // 4. Details Section
    doc.setFont("helvetica", "normal");
    doc.setFontSize(config.fontSize - 1);

    // Compact Details: Try to combine more info
    const detailLines: string[] = [];

    // Line 1: GemType & Color
    if (fields.includes("gemType") || fields.includes("color")) {
        const parts = [];
        if (fields.includes("gemType")) parts.push(item.gemType);
        if (fields.includes("color")) parts.push(item.color);
        if (parts.length > 0) detailLines.push(parts.join(" • "));
    }

    // Line 2: Shape, Dim, Weight (Combined if possible)
    const line2Parts = [];
    if (fields.includes("shape") && item.shape) line2Parts.push(item.shape);
    if (fields.includes("dimensions") && item.dimensions) line2Parts.push(item.dimensions);
    
    // Add Weight to this line if it fits? 
    // Let's keep Weight separate or append if short.
    // For now, let's just push Shape/Dim
    if (line2Parts.length > 0) detailLines.push(line2Parts.join(" • "));

    // Line 3: Weight (and Ratti)
    if (fields.includes("weight")) {
        let weightText = `${item.weightValue} ${item.weightUnit}`;
        if (item.weightRatti) weightText += ` (${item.weightRatti.toFixed(2)} R)`;
        
        // If previous line was short, maybe append? 
        // Complexity: we don't know width easily in raw jsPDF without measuring.
        // Let's just add as new line for safety.
        detailLines.push(weightText);
    }

    // Render detail lines
    detailLines.forEach(line => {
        doc.text(line, contentX, currentY);
        currentY += lineHeight;
    });

    // Stock Location (Right aligned or new line?)
    if (fields.includes("stockLocation") && item.stockLocation) {
        doc.setFont("courier", "normal");
        doc.setFontSize(config.fontSize - 1);
        doc.text(`Loc: ${item.stockLocation}`, contentX, currentY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(config.fontSize - 1);
        currentY += lineHeight;
    }

    // Price
    if (fields.includes("price")) {
        if (config.showEncodedPrice && item.priceWithChecksum) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(config.fontSize + 1);
            doc.text(`R ${item.priceWithChecksum}`, contentX, currentY);
        } else {
            // Show normal price
            doc.setFont("helvetica", "bold");
            let priceText = "";
            if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat) {
                 priceText = `R ${item.sellingRatePerCarat.toLocaleString()}/ct`;
            } else {
                 priceText = `R ${item.sellingPrice.toLocaleString()}`;
            }
            doc.text(priceText, contentX, currentY);
        }
    }

    // Footer Branding (Smaller, Bottom Centered)
    if (fields.includes("companyName")) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(4); // Very small
        doc.setTextColor(150);
        doc.text("KhyatiGems™", x + (config.labelWidth / 2), y + config.labelHeight - 1, { align: "center" });
    }
}
