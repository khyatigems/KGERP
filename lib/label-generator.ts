import jsPDF from "jspdf";
import QRCode from "qrcode";
import { formatInrNumber, formatInrValue } from "@/lib/number-formatting";
import { analyzeThermalBatch, analyzeThermalLabel, buildThermalQrValue } from "@/lib/thermal-label-layout";

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
    includeChecksumInR: boolean;
    qrSize: number;
    fontSize: number;
    selectedFields: string[];
    companyLogo?: string; // Base64 Data URL
    thermalLogoUrl?: string; // Generated Black Logo
    safeMargin?: number; // Thermal-only printable edge margin (mm)
    companyName?: string; // Thermal company-name field text
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
    includeChecksumInR: true,
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
    includeChecksumInR: true,
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
    labelHeight: 25,
    showPrice: false,
    showEncodedPrice: false,
    includeChecksumInR: true,
    qrSize: 12,
    fontSize: 8,
    safeMargin: 1.5,
    selectedFields: ["itemName", "sku", "weight", "price", "qrCode"]
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

export async function generateLabelPDF(items: LabelItem[], config: LabelConfig) {
    if (!items.length) throw new Error("Select at least one product to print.");
    if (config.pageSize === "THERMAL") {
        const preflight = analyzeThermalBatch(items, config, window.location.origin);
        if (!preflight.fits) {
            const issue = preflight.issues.find(issue => issue.severity === "error");
            throw new Error(`Label cannot be printed safely (${issue?.sku}): ${issue?.message} ${issue?.suggestion}`);
        }
    }
    const isCustomSize = config.pageSize === "TAG" || config.pageSize === "THERMAL";
    const orientation = isCustomSize && config.labelWidth >= config.labelHeight ? "landscape" : "portrait";
    const doc = new jsPDF({
        orientation,
        unit: "mm",
        format: isCustomSize ? [config.labelWidth, config.labelHeight] : "a4"
    });
    if (config.pageSize !== "THERMAL") {
        await loadFont(doc, "notosansdisplay");
        await loadFont(doc, "poppins");
    }
    const pdfFontFamily = loadedFonts.has("notosansdisplay") ? "notosansdisplay" : (loadedFonts.has("poppins") ? "poppins" : "helvetica");
    doc.setCharSpace(0);

    const qrCodes: Record<string, string> = {};

    let thermalLogoUrl = "";
    if (config.pageSize === "THERMAL" && (config.selectedFields?.includes("companyLogo"))) {
         thermalLogoUrl = await getThermalLogoDataUrl();
    }

    for (const item of items) {
        if (config.pageSize === "THERMAL") break; // Thermal QRs are measured vector modules.
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
    }

    let currentItemIndex = 0;
    
    if (config.pageSize === "TAG" || config.pageSize === "THERMAL") {
        const effectiveConfig = { ...config, thermalLogoUrl, pdfFontFamily }; 

        items.forEach((item, index) => {
            const key = item.serialNumber || item.sku;
            if (index > 0) {
                doc.addPage([config.labelWidth, config.labelHeight], orientation);
            }
            renderLabel(doc, item, 0, 0, effectiveConfig, qrCodes[key]);
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

                    renderLabel(doc, item, x, y, effectiveConfig, qrCodes[key]);
                    
                    currentItemIndex++;
                }
            }
        }
    }

    return doc.output("bloburl");
}

function renderLabel(doc: jsPDF, item: LabelItem, x: number, y: number, config: LabelConfig, qrDataUrl: string) {
    // Branch for specialized THERMAL layout
    if (config.pageSize === "THERMAL") {
        renderThermalLabel(doc, item, config);
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
        const basePrice = config.includeChecksumInR ? (item.priceWithChecksum ?? item.sellingPrice) : item.sellingPrice;
        let priceText = `R ${formatInrValue(basePrice)}`;

        // Append mode indicator
        if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat) {
            priceText += ` (R ${formatInrNumber(item.sellingRatePerCarat, 0)}/ct)`;
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

// Specialized renderer for thermal thermal labels.
// Renders from the same measured layout that drives the preview, so what the
// user sees is exactly what prints — no fixed positions that can overlap.
function renderThermalLabel(doc: jsPDF, item: LabelItem, config: LabelConfig) {
    const layout = analyzeThermalLabel(item, config, buildThermalQrValue(item.sku, window.location.origin), { autoFit: true });
    doc.setTextColor(0, 0, 0);
    doc.setFillColor(0, 0, 0);
    for (const el of layout.elements) {
        if (el.kind === "text") {
            doc.setFont("helvetica", el.bold ? "bold" : "normal");
            doc.setFontSize(el.fontSize);
            doc.text(el.text, el.x, el.y, { baseline: "top" });
        } else if (el.kind === "qr") {
            // Draw modules as vector rectangles: no image resampling at 203 dpi.
            const moduleMm = el.width / (el.modules + 8);
            for (let row = 0; row < el.modules; row++) {
                for (let col = 0; col < el.modules; col++) {
                    if (el.matrix[row][col] === "1") {
                        doc.rect(el.x + (col + 4) * moduleMm, el.y + (row + 4) * moduleMm, moduleMm, moduleMm, "F");
                    }
                }
            }
        } else if (el.kind === "barcode") {
            const moduleMm = el.width / (el.modules + 20);
            for (let i = 0; i < el.modules; i++) {
                if (el.bits[i] === "1") {
                    doc.rect(el.x + (i + 10) * moduleMm, el.y, moduleMm, el.height, "F");
                }
            }
        } else if (el.kind === "logo" && el.source.toLowerCase().startsWith("data:image/png")) {
            try {
                doc.addImage(el.source, "PNG", el.x, el.y, el.width, el.height);
            } catch (e) {
                console.error("Error adding logo to label", e);
            }
        }
    }
}
