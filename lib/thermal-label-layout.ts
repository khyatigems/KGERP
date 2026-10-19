import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { LabelConfig, LabelItem } from "@/lib/label-generator";
import { formatInrNumber, formatInrValue } from "@/lib/number-formatting";

export const THERMAL_FIELD_LABELS: Record<string, string> = {
    itemName: "Item name", internalName: "Internal name", sku: "SKU", weight: "Weight",
    qrCode: "Product QR", gemType: "Gem type", color: "Color", shape: "Shape",
    dimensions: "Dimensions", stockLocation: "Stock location", price: "Price",
    companyName: "Company name", companyLogo: "Company logo", barcode: "SKU barcode",
};

export const THERMAL_LOGO_SVG_DATA_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><g fill="#000"><polygon points="391.3,256.3 300.9,375.7 420.8,256.3"/><polygon points="465.1,256.3 374.7,375.7 494.6,256.3"/><polygon points="608.7,256.3 699.1,375.7 579.2,256.3"/><polygon points="534.9,256.3 625.3,375.7 505.4,256.3"/><polygon points="641.4,256.3 793.5,375.7 872,375.7 658.2,207.8 342.1,207.8 176.5,337.9 176.5,207.8 176,207.8 128,245.4 128,738.2 176.3,792.2 176.5,792.2 176.5,430.2 500.1,792.2 745.1,518.2 788.5,469.7 723.4,469.7 453.9,469.7 497.3,518.2 680.1,518.2 500.1,719.4 320.2,518.2 276.8,469.7 198.6,382.2 358.8,256.3"/></g></svg>')}`;

export const THERMAL_PRINTER_DPI = 203;
export const THERMAL_MIN_FONT_SIZE = 6;
export const THERMAL_QR_QUIET_MODULES = 4;
const DOT_MM = 25.4 / THERMAL_PRINTER_DPI;
const PT_MM = 25.4 / 72;
const GAP = 0.75;

interface ThermalElementBounds { x: number; y: number; width: number; height: number; }
/** Text y is the top of the line, matching jsPDF's baseline: "top". All geometry is millimetres. */
export interface ThermalLabelTextElement extends ThermalElementBounds {
    kind: "text"; field: string; text: string; fontSize: number; bold: boolean;
    fields?: string[];
}
export interface ThermalLabelQrElement extends ThermalElementBounds {
    kind: "qr"; field: "qrCode"; value: string; modules: number; path: string; matrix: string[];
}
export interface ThermalLabelBarcodeElement extends ThermalElementBounds {
    kind: "barcode"; field: "barcode"; value: string; modules: number; path: string; bits: string;
}
export interface ThermalLabelLogoElement extends ThermalElementBounds {
    kind: "logo"; field: "companyLogo"; source: string;
}
export type ThermalLabelElement = ThermalLabelTextElement | ThermalLabelQrElement | ThermalLabelBarcodeElement | ThermalLabelLogoElement;
export interface ThermalLabelIssue { field: string; severity: "error" | "warning"; message: string; suggestion: string; }
export interface ThermalLabelLayout {
    elements: ThermalLabelElement[];
    overflowElements: ThermalLabelTextElement[];
    compactDetails: boolean;
    requiredTextHeight: number;
    availableTextHeight: number;
    issues: ThermalLabelIssue[];
    fits: boolean;
    usedHeight: number;
    availableHeight: number;
    minimumQrSize: number;
    appliedFontSize: number;
    appliedQrSize: number;
    adjustments: string[];
}

/** Fields the auto-fitter and field-removal suggestions must never drop: a price tag without these is worthless. */
export const THERMAL_PROTECTED_FIELDS = ["itemName", "sku", "weight", "price", "qrCode", "barcode"];
const THERMAL_OPTIONAL_REMOVAL_ORDER = ["companyLogo", "companyName", "stockLocation", "dimensions", "internalName", "color", "shape", "gemType"];
const THERMAL_FONT_STEP = 0.5;
export const THERMAL_MIN_QR_MM = 12;
const FIELD_ORDER = ["companyName", "itemName", "internalName", "sku", "weight", "gemType", "color", "shape", "dimensions", "stockLocation", "price"];

/** Fill missing settings only. Invalid supplied dimensions remain visible to preflight. */
export function normalizeThermalConfig(config: Partial<LabelConfig>): LabelConfig {
    return {
        pageSize: "THERMAL", rows: 1, cols: 1, marginTop: 0, marginLeft: 0,
        horizontalGap: 0, verticalGap: 0, labelWidth: 50, labelHeight: 25,
        showPrice: false, showEncodedPrice: false, includeChecksumInR: true,
        qrSize: 14, fontSize: 7, safeMargin: 1.5,
        ...config,
        selectedFields: Array.isArray(config.selectedFields)
            ? Array.from(new Set(config.selectedFields)) : ["itemName", "sku", "weight", "qrCode"],
        pdfFontFamily: "helvetica",
    };
}

export function buildThermalQrValue(sku: string, origin: string): string {
    return `${origin.replace(/\/+$/, "")}/preview/${encodeURIComponent(sku)}?source=qr`;
}

let measuringDocument: jsPDF | undefined;
function measureText(text: string, fontSize: number, bold: boolean): number {
    measuringDocument ??= new jsPDF({ unit: "mm" });
    measuringDocument.setFont("helvetica", bold ? "bold" : "normal");
    measuringDocument.setFontSize(fontSize);
    return measuringDocument.getTextWidth(text);
}

// The built-in PDF Helvetica font uses WinAnsi. Reject unsupported glyphs instead of losing them in print.
function supportedText(text: string): boolean {
    return /^[\x20-\x7e\xa0-\xff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]*$/.test(text);
}

function fieldText(item: LabelItem, config: LabelConfig, field: string): string {
    if (field === "weight") {
        const ratti = item.weightRatti == null ? "" : ` (${item.weightRatti.toFixed(2)} Ratti)`;
        return `${item.weightValue} ${item.weightUnit}${ratti}`;
    }
    if (field === "stockLocation") return item.stockLocation ? `Loc: ${item.stockLocation}` : "";
    if (field === "companyName") return config.companyName || "Khyati Gems";
    if (field === "price") {
        const basePrice = config.includeChecksumInR ? (item.priceWithChecksum ?? item.sellingPrice) : item.sellingPrice;
        let text = `R ${formatInrValue(basePrice)}`;
        if (item.pricingMode === "PER_CARAT" && item.sellingRatePerCarat != null) {
            text += ` (R ${formatInrNumber(item.sellingRatePerCarat, 0)}/ct)`;
        } else if (item.pricingMode === "FLAT") text += " (Flat)";
        return text;
    }
    const value = item[field as keyof LabelItem];
    return value == null ? "" : String(value);
}

/** One measured pass at explicit font/QR sizes. The wrapper below drives the auto-fit loop. */
function buildThermalLayout(item: LabelItem, config: LabelConfig, qrValue: string, fontPt: number, qrMm: number, compactDetails = false): ThermalLabelLayout {
    const elements: ThermalLabelElement[] = [];
    const overflowElements: ThermalLabelTextElement[] = [];
    const issues: ThermalLabelIssue[] = [];
    const issue = (field: string, message: string, suggestion: string, severity: "error" | "warning" = "error") => {
        if (!issues.some(existing => existing.field === field && existing.message === message)) issues.push({ field, severity, message, suggestion });
    };
    const inRange = (value: number, min: number, max: number) => Number.isFinite(value) && value >= min && value <= max;
    if (!inRange(config.labelWidth, 25, 100)) issue("labelWidth", "Label width must be between 25 and 100 mm.", "Enter the measured width of the loaded thermal stock.");
    if (!inRange(config.labelHeight, 15, 150)) issue("labelHeight", "Label height must be between 15 and 150 mm.", "Enter the measured height of the loaded thermal stock.");
    if (!inRange(config.safeMargin!, 1, 4)) issue("safeMargin", "The safe margin must be between 1 and 4 mm.", "Use at least 1 mm around every label edge.");
    if (!inRange(config.fontSize, THERMAL_MIN_FONT_SIZE, 14)) issue("fontSize", "Thermal text must be between 6 and 14 pt.", "Choose a readable font size of at least 6 pt; remove fields if needed.");
    const width = inRange(config.labelWidth, 25, 100) ? config.labelWidth : 50;
    const height = inRange(config.labelHeight, 15, 150) ? config.labelHeight : 25;
    const margin = inRange(config.safeMargin!, 1, 4) ? config.safeMargin! : 1.5;
    const fontSize = inRange(fontPt, THERMAL_MIN_FONT_SIZE, 14) ? fontPt : 7;
    const innerWidth = width - 2 * margin;
    const availableHeight = height - 2 * margin;
    const fields = config.selectedFields;
    const hasBarcode = fields.includes("barcode");
    const hasLogo = fields.includes("companyLogo");
    // A single footer row owns its space, including barcode quiet zones.
    const footerHeight = hasBarcode ? 4.5 : hasLogo ? 4 : 0;
    const footerY = height - margin - footerHeight;
    const contentBottom = footerHeight ? footerY - GAP : height - margin;
    const logoWidth = hasLogo ? 4 : 0;
    let usedBottom = margin;
    let qrBottom = margin;
    let qrWidth = 0;
    let minimumQrSize = 0;
    if (!fields.length) issue("selectedFields", "No fields are selected.", "Select at least an item name or SKU.");
    for (const field of fields) if (!Object.hasOwn(THERMAL_FIELD_LABELS, field)) issue(field, `Unknown label field: ${field}.`, "Remove the unrecognized field.");

    if (hasLogo) {
        elements.push({ kind: "logo", field: "companyLogo", source: config.thermalLogoUrl || config.companyLogo || THERMAL_LOGO_SVG_DATA_URL,
            x: margin, y: footerY + (footerHeight - 4) / 2, width: 4, height: 4 });
        usedBottom = height - margin;
    }
    if (hasBarcode) {
        try {
            const target: { encodings?: { data: string }[] } = {};
            (JsBarcode as unknown as (target: object, value: string, options: object) => void)(target, item.sku, { format: "CODE128", displayValue: false });
            const bits = target.encodings?.map(encoding => encoding.data).join("") || "";
            if (!bits) throw new Error("Empty barcode");
            const modules = bits.length;
            const barcodeAreaX = margin + (hasLogo ? logoWidth + GAP : 0);
            const barcodeAreaWidth = width - margin - barcodeAreaX;
            const dots = Math.min(2, Math.floor(barcodeAreaWidth / ((modules + 20) * DOT_MM)));
            const barcodeWidth = (modules + 20) * Math.max(1, dots) * DOT_MM;
            if (dots < 1) {
                issue("barcode", `The full SKU barcode needs ${barcodeWidth.toFixed(1)} mm, but its footer has ${barcodeAreaWidth.toFixed(1)} mm.`, "Use wider stock or remove the logo. The SKU must not be shortened.");
            } else {
                if (dots === 1) issue("barcode", "Dense SKU barcode: one printer dot per module to fit this label.", "Test a printed label with your scanner. Wider stock allows a more robust two-dot barcode.", "warning");
                const path = Array.from(bits).map((bit, index) => bit === "1" ? `M${index + 10},0h1v1h-1z` : "").join("");
                elements.push({ kind: "barcode", field: "barcode", x: barcodeAreaX + (barcodeAreaWidth - barcodeWidth) / 2, y: footerY,
                    width: barcodeWidth, height: 4.5, value: item.sku, modules, path, bits });
                usedBottom = height - margin;
            }
        } catch { issue("barcode", "This SKU cannot be encoded as a Code 128 barcode.", "Check the SKU or use the product QR."); }
    }
    if (fields.includes("qrCode")) {
        try {
            if (!qrValue) throw new Error("Missing QR value");
            const code = QRCode.create(qrValue, { errorCorrectionLevel: "M" });
            const modules = code.modules.size;
            minimumQrSize = Math.max(THERMAL_MIN_QR_MM, Math.ceil((modules + 8) * 2 * DOT_MM * 10) / 10);
            if (!Number.isFinite(qrMm) || qrMm < minimumQrSize - 0.001) issue("qrCode", `This product QR needs at least ${minimumQrSize.toFixed(1)} mm at 203 dpi.`, `Increase QR size to ${minimumQrSize.toFixed(1)} mm.`);
            const size = Number.isFinite(qrMm) && qrMm > 0 ? qrMm : 14;
            if (size > innerWidth || margin + size > contentBottom + 0.001) {
                issue("qrCode", "The QR and its quiet zone do not fit above the reserved footer.", "Use taller stock. The QR must retain its safe minimum size.");
            } else {
                let path = "";
                const matrix = Array.from({ length: modules }, (_, row) => Array.from({ length: modules }, (_, col) => {
                    const dark = code.modules.get(row, col);
                    if (dark) path += `M${col + 4},${row + 4}h1v1h-1z`;
                    return dark ? "1" : "0";
                }).join(""));
                elements.push({ kind: "qr", field: "qrCode", x: width - margin - size, y: margin, width: size, height: size, value: qrValue, modules, path, matrix });
                qrWidth = size; qrBottom = margin + size;
                usedBottom = Math.max(usedBottom, qrBottom);
            }
        } catch { issue("qrCode", "The product URL could not be encoded as a QR.", "Check the product SKU and ERP address."); }
    }

    const values = new Map<string, string>();
    for (const field of FIELD_ORDER.filter(field => fields.includes(field))) {
        const value = fieldText(item, config, field).replace(/\s+/g, " ").trim();
        if (!value) { issue(field, `${THERMAL_FIELD_LABELS[field]} is empty for this item.`, "Add its saved value or deselect it.", "warning"); continue; }
        if (!supportedText(value)) issue(field, `${THERMAL_FIELD_LABELS[field]} includes characters unavailable in the thermal font.`, "Use supported Latin text before printing.");
        if (value.length > 2000) { issue(field, `${THERMAL_FIELD_LABELS[field]} is too long for a thermal label.`, "Shorten the saved value or deselect it."); continue; }
        values.set(field, value);
    }
    const shortFields = ["gemType", "color", "shape"];
    const blocks: { field: string; fields: string[]; text: string }[] = [];
    let grouped = false;
    for (const [field, value] of values) {
        if (compactDetails && shortFields.includes(field)) {
            if (grouped) continue;
            grouped = true;
            const parts = shortFields.filter(key => values.has(key));
            blocks.push({ field, fields: parts, text: parts.map(key => values.get(key)).join(" / ") });
        } else blocks.push({ field, fields: [field], text: value });
    }
    let y = margin;
    for (const block of blocks) {
        // At the minimum size, headings shrink too, rather than retaining a hidden +1 pt.
        const size = block.field === "itemName" && fontSize >= 7 ? fontSize + 1 : fontSize;
        const bold = ["itemName", "sku", "price", "companyName"].includes(block.field);
        const lineHeight = size * PT_MM * 1.12;
        let remaining = block.text;
        while (remaining.length) {
            let maxWidth = innerWidth;
            if (qrWidth && y < qrBottom + GAP) {
                maxWidth -= qrWidth + GAP;
                if (maxWidth < Math.min(8, measureText(remaining, size, bold))) { y = qrBottom + GAP; maxWidth = innerWidth; }
            }
            let end = remaining.length;
            if (measureText(remaining, size, bold) > maxWidth) {
                let low = 1, high = remaining.length;
                while (low <= high) {
                    const mid = Math.floor((low + high) / 2);
                    if (measureText(remaining.slice(0, mid), size, bold) <= maxWidth) low = mid + 1; else high = mid - 1;
                }
                end = Math.max(1, high);
                const space = remaining.lastIndexOf(" ", end);
                if (space > 0) end = space;
            }
            const line = remaining.slice(0, end).trimEnd();
            const element: ThermalLabelTextElement = { kind: "text", field: block.field, fields: block.fields, x: margin, y,
                width: measureText(line, size, bold), height: lineHeight, text: line, fontSize: size, bold };
            if (y + lineHeight <= contentBottom + 0.001 && element.width <= maxWidth + 0.001) elements.push(element);
            else {
                // Do not draw invalid content through a barcode/logo or clip it invisibly.
                overflowElements.push(element);
                issue(block.field, `${block.fields.map(field => THERMAL_FIELD_LABELS[field]).join(" / ")} needs more text space.`, "Remove an optional field, shorten its saved value, or use taller stock. Printing stays blocked.");
            }
            y += lineHeight;
            remaining = remaining.slice(end).trimStart();
        }
        y += compactDetails ? 0.15 : 0.25;
    }
    const requiredTextHeight = Math.max(0, y - margin - (blocks.length ? compactDetails ? 0.15 : 0.25 : 0));
    usedBottom = Math.max(usedBottom, margin + requiredTextHeight);
    if (!elements.length) issue("selectedFields", "The selected fields contain no printable content.", "Select the item name or SKU.");
    return { elements, overflowElements, compactDetails, requiredTextHeight, availableTextHeight: Math.max(0, contentBottom - margin),
        issues, fits: !issues.some(entry => entry.severity === "error"), usedHeight: Math.max(0, usedBottom - margin), availableHeight,
        minimumQrSize, appliedFontSize: fontSize, appliedQrSize: Number.isFinite(qrMm) && qrMm > 0 ? qrMm : 14, adjustments: [] };
}

/**
 * Measured layout for one item, with an auto-fit pass: if the configured font/QR
 * sizes overflow the label, the font is stepped down (never below
 * THERMAL_MIN_FONT_SIZE) and the QR only down to its smallest scannable size at
 * the printer's 203 dpi. Nothing is removed and no text is truncated.
 */
export function analyzeThermalLabel(item: LabelItem, input: Partial<LabelConfig>, qrValue: string, options: { autoFit?: boolean } = {}): ThermalLabelLayout {
    const config = normalizeThermalConfig(input);
    let best = buildThermalLayout(item, config, qrValue, config.fontSize!, config.qrSize!);
    if (options.autoFit) {
        // Repair too-small legacy QR settings first; never sacrifice QR density to fit text.
        const safeQr = config.selectedFields.includes("qrCode") ? Math.max(config.qrSize, best.minimumQrSize) : config.qrSize;
        const fitAtQrSize = (qrSize: number) => {
            let pt = config.fontSize;
            let candidate = buildThermalLayout(item, config, qrValue, pt, qrSize);
            while (!candidate.fits) {
                const compact = buildThermalLayout(item, config, qrValue, pt, qrSize, true);
                if (compact.fits || compact.overflowElements.length <= candidate.overflowElements.length) candidate = compact;
                if (candidate.fits || pt <= THERMAL_MIN_FONT_SIZE + 0.001) break;
                pt = Math.max(THERMAL_MIN_FONT_SIZE, pt - THERMAL_FONT_STEP);
                candidate = buildThermalLayout(item, config, qrValue, pt, qrSize);
            }
            return candidate;
        };
        best = fitAtQrSize(safeQr);
        // Reduce an oversized QR only after trying readable text sizes.
        if (!best.fits && config.selectedFields.includes("qrCode") && safeQr > best.minimumQrSize) {
            best = fitAtQrSize(best.minimumQrSize);
        }
    }
    if (best.appliedFontSize !== config.fontSize) best.adjustments.push(`Text ${best.appliedFontSize.toFixed(1)} pt`);
    if (best.compactDetails) best.adjustments.push("Compact gemstone details");
    if (config.selectedFields.includes("qrCode") && best.appliedQrSize !== config.qrSize) best.adjustments.push(`QR ${best.appliedQrSize.toFixed(1)} mm (4-module quiet zone)`);
    return best;
}

export function analyzeThermalBatch(items: LabelItem[], config: Partial<LabelConfig>, origin: string, autoFit = true) {
    const layouts = items.map(item => ({ item, layout: analyzeThermalLabel(item, config, buildThermalQrValue(item.sku, origin), { autoFit }) }));
    const issues = layouts.flatMap(({ item, layout }) => layout.issues.map(issue => ({ itemId: item.id, sku: item.sku, ...issue })));
    return { fits: layouts.length > 0 && layouts.every(({ layout }) => layout.fits), layouts, issues };
}

/**
 * Suggestions only; never silently removes fields. Protected essentials
 * (item name, SKU, weight, price, QR) are kept in every case, optional fields
 * go first, and the auto-fitter gets a chance to shrink sizes before any field
 * is dropped.
 */
export function suggestThermalFieldRemovals(items: LabelItem[], input: Partial<LabelConfig>, origin: string): string[] {
    const config = normalizeThermalConfig(input);
    const removed: string[] = [];
    for (const field of THERMAL_OPTIONAL_REMOVAL_ORDER) {
        if (analyzeThermalBatch(items, config, origin, true).fits) break;
        if (!THERMAL_PROTECTED_FIELDS.includes(field) && config.selectedFields.includes(field)) {
            removed.push(field);
            config.selectedFields = config.selectedFields.filter(selected => selected !== field);
        }
    }
    return removed;
}

