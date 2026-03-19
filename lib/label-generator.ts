import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { formatInrCurrency, formatInrNumber, formatInrValue } from "@/lib/number-formatting";

const FONTS: Record<string, { normal: string; bold: string; italic?: string; bolditalic?: string }> = {
    notosansdisplay: {
        normal: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
        bold: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLplK4fy6r6tOBEJg0IAKzqdFZVZxokvfn_BDLxR.ttf",
        italic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf",
        bolditalic: "https://fonts.gstatic.com/s/notosansdisplay/v20/RLpjK4fy6r6tOBEJg0IAKzqdFZVZxrktdHvjCaxRgew.ttf"
    },
    poppins: {
        normal: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.ttf",
        bold: "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.ttf",
        italic: "https://fonts.gstatic.com/s/poppins/v20/pxiGyp8kv8JHgFVrJJLucHtF.ttf",
        bolditalic: "https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmy1zlFPE.ttf"
    }
};

const loadedFonts = new Set<string>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i]);
    return binary;
}

async function loadFont(doc: jsPDF, family: string) {
    if (loadedFonts.has(family)) return;
    const fontDef = FONTS[family];
    if (!fontDef) return;

    const promises = [
        fetch(fontDef.normal).then((r) => (r.ok ? r.arrayBuffer() : null)),
        fetch(fontDef.bold).then((r) => (r.ok ? r.arrayBuffer() : null)),
    ];
    if (fontDef.italic) promises.push(fetch(fontDef.italic).then((r) => (r.ok ? r.arrayBuffer() : null)));
    if (fontDef.bolditalic) promises.push(fetch(fontDef.bolditalic).then((r) => (r.ok ? r.arrayBuffer() : null)));

    const [normBuf, boldBuf, italicBuf, boldItalicBuf] = await Promise.all(promises);

    if (normBuf) {
        const normStr = arrayBufferToBinaryString(normBuf);
        doc.addFileToVFS(`${family}-Regular.ttf`, normStr);
        doc.addFont(`${family}-Regular.ttf`, family, "normal");
    }
    if (boldBuf) {
        const boldStr = arrayBufferToBinaryString(boldBuf);
        doc.addFileToVFS(`${family}-Bold.ttf`, boldStr);
        doc.addFont(`${family}-Bold.ttf`, family, "bold");
    }
    if (italicBuf && fontDef.italic) {
        const italicStr = arrayBufferToBinaryString(italicBuf);
        doc.addFileToVFS(`${family}-Italic.ttf`, italicStr);
        doc.addFont(`${family}-Italic.ttf`, family, "italic");
    }
    if (boldItalicBuf && fontDef.bolditalic) {
        const biStr = arrayBufferToBinaryString(boldItalicBuf);
        doc.addFileToVFS(`${family}-BoldItalic.ttf`, biStr);
        doc.addFont(`${family}-BoldItalic.ttf`, family, "bolditalic");
    }

    loadedFonts.add(family);
}

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
    internalName?: string;
    stockLocation?: string | null;
    sellingPrice: number;
    pricingMode?: string; // PER_CARAT | FLAT
    sellingRatePerCarat?: number | null;
    priceWithChecksum?: string; // Pre-calculated encoded price
    serialNumber?: string;
    shortHash?: string;
}

export interface LabelConfig {
    pageSize: "TAG" | "A4" | "THERMAL";
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
    companyLogo?: string; // Base64 Data URL
    thermalLogoUrl?: string; // Generated Black Logo
    pdfFontFamily?: string;
}

export const DEFAULT_FIELDS = [
    "itemName",
    "internalName",
    "sku",
    "qrCode",
    "gemType",
    "color",
    "shape",
    "weight",
    "stockLocation",
    "price",
    "companyLogo"
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

export const DEFAULT_THERMAL_CONFIG: LabelConfig = {
    pageSize: "THERMAL",
    rows: 1,
    cols: 1,
    marginTop: 0,
    marginLeft: 0,
    horizontalGap: 0,
    verticalGap: 0,
    labelWidth: 50,
    labelHeight: 27.5,
    showPrice: false,
    showEncodedPrice: false,
    qrSize: 10,
    fontSize: 8, // Slightly larger font for 50mm width
    selectedFields: DEFAULT_FIELDS
};

// Optimized Black SVG for Thermal Printing (Khyati Gems)
const THERMAL_LOGO_SVG = `
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000">
    <g fill="#000000">
        <polygon points="391.3,256.3 300.9,375.7 420.8,256.3"/>
        <polygon points="465.1,256.3 374.7,375.7 494.6,256.3"/>
        <polygon points="608.7,256.3 699.1,375.7 579.2,256.3"/>
        <polygon points="534.9,256.3 625.3,375.7 505.4,256.3"/>
        <polygon points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3"/>
    </g>
</svg>
`;

// Helper to convert SVG string to PNG Data URL
function getThermalLogoDataUrl(): Promise<string> {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 1000;
                canvas.height = 1000;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL("image/png"));
                } else {
                    resolve("");
                }
            };
            img.onerror = () => resolve("");
            img.src = "data:image/svg+xml;base64," + btoa(THERMAL_LOGO_SVG);
        } catch (e) {
            console.error("Logo Gen Error", e);
            resolve("");
        }
    });
}

// Helper to generate Barcode Data URL
function generateBarcodeDataUrl(text: string): string {
    try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, text, {
            format: "CODE128",
            width: 1.2,
            height: 26,
            displayValue: false, // We print SKU manually
            margin: 0
        });
        return canvas.toDataURL("image/png");
    } catch (e) {
        console.error("Barcode Gen Error", e);
        return "";
    }
}

export async function generateLabelPDF(items: LabelItem[], config: LabelConfig) {
    const isCustomSize = config.pageSize === "TAG" || config.pageSize === "THERMAL";
    const doc = new jsPDF({
        orientation: isCustomSize ? "landscape" : "portrait",
        unit: "mm",
        format: isCustomSize ? [config.labelHeight, config.labelWidth] : "a4"
    });
    await loadFont(doc, "notosansdisplay");
    await loadFont(doc, "poppins");
    const pdfFontFamily = loadedFonts.has("notosansdisplay") ? "notosansdisplay" : (loadedFonts.has("poppins") ? "poppins" : "helvetica");
    doc.setCharSpace(0);

    const qrCodes: Record<string, string> = {};
    const barcodes: Record<string, string> = {};
    
    let thermalLogoUrl = "";
    if (config.pageSize === "THERMAL" && (config.selectedFields?.includes("companyLogo"))) {
         thermalLogoUrl = await getThermalLogoDataUrl();
    }

    for (const item of items) {
        const key = item.sku;
        if (!qrCodes[key]) {
            try {
                const url = `${window.location.origin}/preview/${item.sku}?source=qr`;
                
                qrCodes[key] = await QRCode.toDataURL(url, { 
                    margin: 0,
                    errorCorrectionLevel: 'M'
                });
            } catch (e) {
                console.error("QR Gen Error", e);
            }
        }
        if (!barcodes[key]) {
            barcodes[key] = generateBarcodeDataUrl(item.sku);
        }
    }

    let currentItemIndex = 0;
    
    if (config.pageSize === "TAG" || config.pageSize === "THERMAL") {
        const effectiveConfig = { ...config, thermalLogoUrl, pdfFontFamily }; 

        items.forEach((item, index) => {
            const key = item.serialNumber || item.sku;
            if (index > 0) {
                doc.addPage([config.labelHeight, config.labelWidth], "landscape");
            }
            renderLabel(doc, item, 0, 0, effectiveConfig, qrCodes[key], barcodes[key]);
        });
    } else {
        const itemsPerPage = config.rows * config.cols;
        const totalPages = Math.ceil(items.length / itemsPerPage);
        const effectiveConfig = { ...config, pdfFontFamily };

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) doc.addPage("a4", "portrait");

            for (let row = 0; row < config.rows; row++) {
                for (let col = 0; col < config.cols; col++) {
                    if (currentItemIndex >= items.length) break;
                    
                    const item = items[currentItemIndex];
                    const key = item.serialNumber || item.sku;
                    const x = config.marginLeft + (col * (config.labelWidth + config.horizontalGap));
                    const y = config.marginTop + (row * (config.labelHeight + config.verticalGap));
                    
                    doc.setDrawColor(200);
                    doc.setLineWidth(0.1);
                    doc.rect(x, y, config.labelWidth, config.labelHeight);

                    renderLabel(doc, item, x, y, effectiveConfig, qrCodes[key], barcodes[key]);
                    
                    currentItemIndex++;
                }
            }
        }
    }

    return doc.output("bloburl");
}

function renderLabel(doc: jsPDF, item: LabelItem, x: number, y: number, config: LabelConfig, qrDataUrl: string, barcodeDataUrl: string) {
    // Branch for specialized THERMAL layout
    if (config.pageSize === "THERMAL") {
        renderThermalLabel(doc, item, x, y, config, qrDataUrl, barcodeDataUrl);
        return;
    }

    const padding = 1.5; // Tighter padding
    const contentX = x + padding;
    const contentY = y + padding;
    
    // Safety check for selectedFields
    const fields = config.selectedFields || DEFAULT_FIELDS;
    const fontFamily = config.pdfFontFamily || "helvetica";
    
    doc.setTextColor(0);
    
    let currentY = contentY + 2.5; // Start Y position
    const lineHeight = 2.8; // Compact line height

    // 1. QR Code (Top Right)
    if (fields.includes("qrCode") && qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", x + config.labelWidth - config.qrSize - 1, y + 1, config.qrSize, config.qrSize);
    }

    // 2. Item Name
    if (fields.includes("itemName")) {
        doc.setFont(fontFamily, "bold");
        
        // Calculate available width
        // QR Code is at right side with size + margin
        let availableWidth = config.labelWidth - (padding * 2);
        if (fields.includes("qrCode") && qrDataUrl) {
            availableWidth -= (config.qrSize + 1);
        }

        // Auto-fit logic for single line
        const maxFontSize = config.fontSize + 2;
        const minFontSize = 4; // Minimum readable size
        let currentFontSize = maxFontSize;
        doc.setFontSize(currentFontSize);
        
        let textWidth = doc.getTextWidth(item.itemName);
        
        // Loop to reduce font size until it fits
        while (textWidth > availableWidth && currentFontSize > minFontSize) {
            currentFontSize -= 0.5;
            doc.setFontSize(currentFontSize);
            textWidth = doc.getTextWidth(item.itemName);
        }
        
        // If still doesn't fit after reaching minFontSize, truncate
        let textToPrint = item.itemName;
        if (textWidth > availableWidth) {
             while (doc.getTextWidth(textToPrint + "...") > availableWidth && textToPrint.length > 0) {
                 textToPrint = textToPrint.slice(0, -1);
             }
             textToPrint += "...";
        }

        // Print single line
        doc.text(textToPrint, contentX, currentY);
        
        // Adjust Y based on actual font size used
        const textHeight = currentFontSize * 0.3527; 
        currentY += (textHeight * 1.2) + 0.5;
    }

    // 2.5 Internal Name (Below Item Name, Small, Bold)
    if (fields.includes("internalName") && item.internalName) {
        doc.setFont(fontFamily, "bold");
        doc.setFontSize(config.fontSize - 1); // Smaller than item name
        doc.text(item.internalName, contentX, currentY);
        currentY += lineHeight + 0.5;
    }

    // 3. SKU
    if (fields.includes("sku")) {
        doc.setFont("courier", "normal");
        doc.setFontSize(config.fontSize);
        doc.text(item.sku, contentX, currentY);
        currentY += lineHeight + 0.5; // Extra gap before details
    }

    // 4. Details Section
    doc.setFont(fontFamily, "normal");
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

    // Line 2: Shape (Combined if possible)
    const line2Parts = [];
    if (fields.includes("shape") && item.shape) line2Parts.push(item.shape);
    
    // Add Weight to this line if it fits? 
    // Let's keep Weight separate or append if short.
    // For now, let's just push Shape
    if (line2Parts.length > 0) detailLines.push(line2Parts.join(" • "));

    // Line 3: Weight (and Ratti)
    if (fields.includes("weight")) {
        let weightText = `${item.weightValue} ${item.weightUnit}`;
        if (item.weightRatti) weightText += ` (${item.weightRatti.toFixed(2)} Ratti)`;
        
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
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(config.fontSize - 1);
        currentY += lineHeight;
    }

    // Price
    if (fields.includes("price")) {
        doc.setFont(fontFamily, "bold");
        doc.setFontSize(config.fontSize + 1);
        
        // Use server-provided checksum price (Total Price)
        const basePrice = item.priceWithChecksum ?? item.sellingPrice;
        let priceText = formatInrCurrency(basePrice);

        // Append mode indicator
        if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat) {
            priceText += ` (₹${formatInrNumber(item.sellingRatePerCarat, 0)}/ct)`;
        } else if (item.pricingMode === "FLAT") {
            priceText += ` (Flat)`;
        }
        
        doc.text(priceText, contentX, currentY);
    }

    // Footer Branding (Smaller, Bottom Centered)
    if (fields.includes("companyName") || fields.includes("companyLogo")) {
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(4); // Very small
        doc.setTextColor(0); // Black
        doc.text("KhyatiGems™", x + (config.labelWidth / 2), y + config.labelHeight - 1, { align: "center" });
    }
}

// Specialized renderer for 50x25mm Thermal Labels
function renderThermalLabel(doc: jsPDF, item: LabelItem, x: number, y: number, config: LabelConfig, qrDataUrl: string, barcodeDataUrl: string) {
    const padding = 1.5;
    const contentX = x + padding;
    const contentY = y + padding;
    const width = config.labelWidth;
    const height = config.labelHeight;
    const qrSize = 12; // 12mm QR for thermal
    const qrBottom = padding + qrSize; 
    
    doc.setTextColor(0);
    const fields = config.selectedFields || DEFAULT_FIELDS;
    const fontFamily = config.pdfFontFamily || "helvetica";

    // Helper to print text with auto-scaling to fit width
    const printFitText = (text: string, y: number, maxFontSize: number, minFontSize: number, fontName: string, fontStyle: string) => {
        // Determine available width based on Y position (overlap with QR?)
        // Text is drawn at baseline 'y'. Approx height is 2-3mm.
        // If (y - 2mm) < qrBottom, we are potentially next to QR.
        const isNextToQR = (y - 3) < qrBottom;
        
        let maxWidth = width - (padding * 2);
        if (isNextToQR && qrDataUrl) {
            maxWidth = width - qrSize - (padding * 2) - 1; // 1mm gap
        }

        doc.setFont(fontName, fontStyle);
        let fontSize = maxFontSize;
        doc.setFontSize(fontSize);
        
        // Reduce font size until it fits
        while (doc.getTextWidth(text) > maxWidth && fontSize > minFontSize) {
            fontSize -= 0.2; // Fine-grained reduction
            doc.setFontSize(fontSize);
        }
        
        // If still doesn't fit, we might need to truncate (last resort)
        // But with minFontSize=4 or 5, it usually fits. 
        // If not, we truncate to prevent overlap.
        let textToPrint = text;
        if (doc.getTextWidth(text) > maxWidth) {
             while (doc.getTextWidth(textToPrint + "...") > maxWidth && textToPrint.length > 0) {
                 textToPrint = textToPrint.slice(0, -1);
             }
             textToPrint += "...";
        }

        doc.text(textToPrint, contentX, y);
        return fontSize; // Return used font size if needed
    };

    // 1. QR Code (Top Right)
    if (fields.includes("qrCode") && qrDataUrl) {
        doc.addImage(qrDataUrl, "PNG", width - qrSize - padding, padding, qrSize, qrSize);
    }

    let currentY = contentY + 3; // Initial baseline
    
    // Line 1: Item Name (Bold)
    if (fields.includes("itemName")) {
        printFitText(item.itemName, currentY, 9, 5, fontFamily, "bold");
        currentY += 3.5;
    }

    // Line 2: SKU (Monospace)
    // SKU is critical, try to keep it readable.
    if (fields.includes("sku")) {
        printFitText(item.sku, currentY, 8, 5, "courier", "bold");
        currentY += 3;
    }

    // Line 3: GemType • Color (Regular)
    if (fields.includes("gemType") || fields.includes("color")) {
        const line3Parts = [];
        if (fields.includes("gemType")) line3Parts.push(item.gemType);
        if (fields.includes("color")) line3Parts.push(item.color);
        const line3 = line3Parts.filter(Boolean).join(" • ");
        if (line3) {
            printFitText(line3, currentY, 8, 5, fontFamily, "normal");
            currentY += 3;
        }
    }

    // Line 4: Weight • Shape (Regular)
    // This line was overlapping in user's image.
    if (fields.includes("weight") || (fields.includes("shape") && item.shape)) {
        const line4Parts: string[] = [];
        if (fields.includes("weight")) {
            let weightText = `${item.weightValue} ${item.weightUnit}`;
            if (item.weightRatti) weightText += ` (${item.weightRatti.toFixed(2)} Ratti)`;
            line4Parts.push(weightText);
        }
        if (fields.includes("shape") && item.shape) line4Parts.push(item.shape);
        const line4 = line4Parts.filter(Boolean).join(" • ");
        if (line4) {
            printFitText(line4, currentY, 8, 5, fontFamily, "normal");
            currentY += 3.5;
        }
    }

    // Line 5: Price (Bold)
    // This usually clears the QR code, so it gets full width if Y > qrBottom
    if (fields.includes("price")) {
        const basePrice = item.priceWithChecksum ?? item.sellingPrice;
        let priceText = formatInrCurrency(basePrice);
        if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat) {
            priceText += ` (₹${formatInrNumber(Math.round(item.sellingRatePerCarat), 0)})`;
        }
        printFitText(priceText, currentY, 9, 6, fontFamily, "bold");
    }

    // 3. Barcode (Bottom Spanning)
    if (barcodeDataUrl) {
        const barcodeHeight = 5;
        const barcodeWidth = 30;
        const barcodeX = (width - barcodeWidth) / 2;
        const barcodeY = height - barcodeHeight - 1; 
        
        doc.addImage(barcodeDataUrl, "PNG", barcodeX, barcodeY, barcodeWidth, barcodeHeight);

    }

    // 4. Company Logo (Bottom Right Placeholder)
    // Prioritize the optimized black thermal logo
    const logoToUse = config.thermalLogoUrl || config.companyLogo;
    
    if ((config.selectedFields?.includes("companyLogo") || config.selectedFields?.includes("companyName")) && logoToUse) {
        const logoSize = 5; // 5mm square
        const logoX = width - logoSize - 1.5; // 1.5mm from right
        const logoY = height - logoSize - 1.5; // 1.5mm from bottom
        
        try {
            doc.addImage(logoToUse, "PNG", logoX, logoY, logoSize, logoSize, undefined, 'FAST');
        } catch (e) {
            console.error("Error adding logo to label", e);
        }
    }
}
