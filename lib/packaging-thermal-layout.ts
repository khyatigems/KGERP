import jsPDF from "jspdf";
import QRCode from "qrcode";
import type { PackagingLabelData } from "@/lib/packaging-pdf-generator";

export const PACKAGING_THERMAL_WIDTH = 50;
export const PACKAGING_THERMAL_HEIGHT = 25;
export const PACKAGING_THERMAL_MIN_FONT = 6;
const DOT_MM = 25.4 / 203;
const MARGIN = 1;
const GAP = 0.5;
export type PackagingThermalElement =
  | { kind: "text"; field: string; text: string; x: number; y: number; width: number; height: number; fontSize: number; bold: boolean }
  | { kind: "qr"; field: "qr"; value: string; x: number; y: number; width: number; height: number; modules: number; matrix: boolean[][] }
  | { kind: "barcode"; field: "barcode"; value: string; x: number; y: number; width: number; height: number; bits: string }
  | { kind: "logo"; field: "logo"; source: string; x: number; y: number; width: number; height: number };
export interface PackagingThermalBlock { field: string; text: string; bold?: boolean; }
export interface PackagingThermalLayout {
  height: number; fits: boolean; fontSize: number; qrSize: number; elements: PackagingThermalElement[];
  blocks: PackagingThermalBlock[]; overflow: string[]; errors: string[]; warnings: string[];
  pageTitle?: string;
}
export type PackagingThermalBatch = { fits: boolean; entries: Array<{ label: PackagingLabelData; layout: PackagingThermalLayout }> };

export function packagingThermalVerifyUrl(serial: string, origin: string): string {
  const url = new URL(origin);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Enter the HTTPS origin hosting your ERP verification page, without a path.");
  // Uppercase scheme/host are URL-equivalent. A short, case-sensitive /V/ alias
  // lets normal KG serials use QR alphanumeric mode, leaving room for larger dots.
  return `${url.protocol.toUpperCase()}//${url.host.toUpperCase()}/V/${encodeURIComponent(serial)}`;
}
export const PACKAGING_THERMAL_FIELDS = ["branding", "name", "weight", "sku", "treatment", "manufacturingDate", "price", "origin", "reference", "qr"] as const;
export type PackagingThermalField = typeof PACKAGING_THERMAL_FIELDS[number];
export type PackagingThermalOptions = { fields?: readonly PackagingThermalField[] };
const selected = (options: PackagingThermalOptions) => new Set(options.fields ?? PACKAGING_THERMAL_FIELDS);

const clean = (value: unknown) => String(value ?? "").replace(/₹/g, "Rs. ").replace(/\s+/g, " ").trim();
const number = (value: number | undefined, places: number) => Number.isFinite(value) ? value!.toFixed(places) : "-";

/** Thermal essentials only. Full historical identity data and sticker rendering stay unchanged. */
export function packagingThermalBlocks(data: PackagingLabelData, options: PackagingThermalOptions = {}): PackagingThermalBlock[] {
  const retail = data.labelVariant !== "EXPORT";
  const fields = selected(options);
  return [
    ...(!data.logoUrl ? [{ field: "branding", text: data.brandName || "KhyatiGems", bold: true }] : []),
    // Keep the complete saved name; never strip lab-grown, synthetic or imitation disclosure.
    { field: "name", text: data.gemstoneName || data.stoneType || "Gemstone", bold: true },
    { field: "weight", text: `${number(data.weightCarat, 2)} ct | Qty ${data.unitQuantity ?? 1}`, bold: true },
    { field: "sku", text: data.sku, bold: true },
    { field: "treatment", text: `Treatment: ${data.treatment || "Not recorded"}` },
    ...(retail ? [{ field: "price", text: `MRP Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.mrp)} (incl. all taxes)`, bold: true }]
      : [{ field: "origin", text: `Gem origin: ${data.originCountry || data.origin || "Not recorded"}` }]),
    { field: "reference", text: `ID ${data.serial}` },
  ].filter(block => fields.has(block.field as PackagingThermalField)).map(block => ({ ...block, text: clean(block.text) }));
}

function manufacturingDateBlock(data: PackagingLabelData): PackagingThermalBlock | null {
  if (!data.packingDate || Number.isNaN(new Date(data.packingDate).getTime())) return null;
  return { field: "manufacturingDate", text: `Mfg: ${new Date(data.packingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Kolkata" })}` };
}

function makePage(data: PackagingLabelData, origin: string, fontSize: number, includeLogo: boolean, includeDate: boolean, options: PackagingThermalOptions, wideFooter: boolean): PackagingThermalLayout {
  const blocks = packagingThermalBlocks(data, options);
  const fields = selected(options);
  const date = manufacturingDateBlock(data);
  if (includeDate && date) { const footerIndex = blocks.findIndex(block => ["price", "origin", "reference"].includes(block.field)); blocks.splice(footerIndex < 0 ? blocks.length : footerIndex, 0, date); }
  const elements: PackagingThermalElement[] = [], errors: string[] = [], overflow: string[] = [];
  const warnings: string[] = [];
  const doc = new jsPDF({ unit: "mm" });
  const measure = (text: string, size: number, bold: boolean) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); return doc.getTextWidth(text); };
  let qrSize = 0, qrX = PACKAGING_THERMAL_WIDTH - MARGIN, qrBottom = MARGIN;
  if (fields.has("qr")) {
    try {
      const value = packagingThermalVerifyUrl(data.serial, origin);
      const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
      const modules = qr.modules.size;
      qrSize = Math.max(12, (modules + 8) * 4 * DOT_MM);
      qrX = Math.floor((PACKAGING_THERMAL_WIDTH - MARGIN - qrSize) / DOT_MM) * DOT_MM;
      const qrY = Math.ceil(MARGIN / DOT_MM) * DOT_MM;
      qrBottom = qrY + qrSize;
      if (qrX - MARGIN < 15 || qrBottom > 24) errors.push("The verification QR is too large for this stock. Use the sticker format; QR modules cannot be reduced.");
      else elements.push({ kind: "qr", field: "qr", value, x: qrX, y: qrY, width: qrSize, height: qrSize, modules,
        matrix: Array.from({ length: modules }, (_, row) => Array.from({ length: modules }, (_, col) => Boolean(qr.modules.get(row, col)))) });
    } catch { errors.push("The verification URL could not be encoded. Check the ERP address and serial."); }
  }
  let y = MARGIN;
  if (includeLogo && data.logoUrl) {
    const availableWidth = (qrSize ? qrX - GAP : PACKAGING_THERMAL_WIDTH - MARGIN) - MARGIN;
    const ratio = data.thermalLogoAspectRatio || 1.6;
    const height = Math.min(4.2, availableWidth / ratio);
    elements.push({ kind: "logo", field: "logo", source: data.logoUrl, x: MARGIN, y, width: height * ratio, height });
    y += height + .2;
  }
  for (const block of blocks) {
    if (block.text.length > 2000) { errors.push(`${block.field} is too long. Use the larger sticker format.`); continue; }
    if (/[^\x20-\x7e\xa0-\xff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/.test(block.text)) errors.push(`${block.field} contains characters unavailable in the thermal font. Use the sticker format or a supported saved spelling.`);
    // The price/origin and serial use full-width footer rows, clear of the QR.
    const footer = wideFooter && qrSize > 0 && ["price", "origin", "reference"].includes(block.field);
    if (footer) y = Math.max(y, qrBottom + .05);
    const x = MARGIN;
    const initialWidth = (y < qrBottom ? qrX - GAP : PACKAGING_THERMAL_WIDTH - MARGIN) - x;
    const preferredSize = footer ? PACKAGING_THERMAL_MIN_FONT : fontSize + (["branding", "name", "weight"].includes(block.field) ? .5 : 0);
    // Fit this field independently; wrapped continuations retain the same size.
    let size = preferredSize;
    while (size > PACKAGING_THERMAL_MIN_FONT && measure(block.text, size, Boolean(block.bold)) > initialWidth) size = Math.max(PACKAGING_THERMAL_MIN_FONT, size - .25);
    let remaining = block.text;
    while (remaining) {
      const availableWidth = (y < qrBottom ? qrX - GAP : PACKAGING_THERMAL_WIDTH - MARGIN) - x;
      let low = 1, high = remaining.length;
      while (low <= high) { const mid = Math.floor((low + high) / 2); if (measure(remaining.slice(0, mid), size, Boolean(block.bold)) <= availableWidth) low = mid + 1; else high = mid - 1; }
      let end = Math.max(1, high);
      if (end < remaining.length) { const space = remaining.lastIndexOf(" ", end); if (space > 0) end = space; }
      const line = remaining.slice(0, end).trimEnd(), lineWidth = measure(line, size, Boolean(block.bold));
      const lineHeight = size * 25.4 / 72 * (footer ? 1 : 1.02);
      if (y + lineHeight <= PACKAGING_THERMAL_HEIGHT - MARGIN + .001 && lineWidth <= availableWidth + .001) elements.push({ kind: "text", field: block.field, text: line, x, y, width: lineWidth, height: lineHeight, fontSize: size, bold: Boolean(block.bold) });
      else overflow.push(line);
      y += lineHeight;
      remaining = remaining.slice(end).trimStart();
    }
    y += footer ? .08 : .12;
  }
  if (overflow.length) errors.push(`${overflow.length} lines exceed this label at the readable ${PACKAGING_THERMAL_MIN_FONT} pt minimum. Use the larger sticker format; required text is not truncated.`);
  if (fields.has("weight") && (!Number.isFinite(data.weightCarat) || data.weightCarat <= 0)) errors.push("Save a valid positive gemstone weight before printing.");
  if (fields.has("price") && data.labelVariant !== "EXPORT" && (!Number.isFinite(data.mrp) || data.mrp < 0)) errors.push("Save a valid retail MRP before printing.");
  if (!data.sku?.trim() || !data.serial?.trim()) errors.push("SKU and packaging serial are required for traceability.");
  if (fields.has("weight") && (!Number.isInteger(data.unitQuantity ?? 1) || (data.unitQuantity ?? 1) <= 0)) errors.push("Package quantity must be a positive whole number.");
  if (!elements.length) errors.push("Select at least one field to print.");
  return { height: PACKAGING_THERMAL_HEIGHT, fits: !errors.length, fontSize, qrSize, elements, blocks, overflow, errors, warnings, pageTitle: data.labelVariant === "EXPORT" ? "International gemstone identity" : "Retail gemstone identity" };
}
export function analyzePackagingThermal(data: PackagingLabelData, origin: string, options: PackagingThermalOptions = {}): PackagingThermalLayout {
  const hasDate = selected(options).has("manufacturingDate") && Boolean(manufacturingDateBlock(data));
  const hasLogo = selected(options).has("branding") && Boolean(data.logoUrl);
  // Extras must not make an otherwise printable identity fail. Prefer the date
  // when both additions cannot fit, and never reduce text below the 6 pt floor.
  const candidates = [[hasLogo, hasDate], [false, hasDate], [hasLogo, false], [false, false]];
  let result: PackagingThermalLayout | undefined;
  for (const [logo, date] of candidates) {
    for (const wideFooter of [false, true]) {
    for (let size = 7; size >= PACKAGING_THERMAL_MIN_FONT; size -= .25) {
      result = makePage(data, origin, size, logo, date, options, wideFooter);
      if (result.fits) {
        if (hasLogo && !logo) result.warnings.push("Logo omitted to preserve readable identity text on 50 × 25 mm stock.");
        if (hasDate && !date) result.warnings.push("Manufacturing date omitted because it cannot fit at readable sizes on this label.");
        return result;
      }
      if (!result.overflow.length) return result;
    }
    }
  }
  return result!;
}
export function analyzePackagingThermalBatch(labels: PackagingLabelData[], origin: string, options: PackagingThermalOptions = {}): PackagingThermalBatch {
  const entries = labels.map(label => ({ label, layout: analyzePackagingThermal(label, origin, options) }));
  return { fits: entries.length > 0 && entries.every(entry => entry.layout.fits), entries };
}


const logoCache = new Map<string, Promise<{ source: string; aspectRatio: number }>>();
/** Crop only blank/transparent margins; preserve every dark part of the saved logo. */
export async function preparePackagingThermalLogo(source: string): Promise<{ source: string; aspectRatio: number }> {
  const cached = logoCache.get(source); if (cached) return cached;
  const promise = new Promise<{ source: string; aspectRatio: number }>((resolve, reject) => {
    if (typeof document === "undefined") { reject(new Error("The packaging logo must be loaded in a browser before thermal printing.")); return; }
    const image = new Image(); image.crossOrigin = "anonymous";
    const timer = setTimeout(() => reject(new Error("Packaging logo timed out. Check its saved image URL.")), 5000);
    image.onerror = () => { clearTimeout(timer); reject(new Error("Packaging logo could not load. Check its saved image URL.")); };
    image.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d"); if (!context) throw new Error("Image conversion unavailable");
        context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = canvas.width, right = -1, top = canvas.height, bottom = -1;
        for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
          const i = (y * canvas.width + x) * 4;
          const value = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114 < 185 ? 0 : 255;
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
          if (value === 0) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
        }
        if (right < left) throw new Error("The saved logo has no printable dark content.");
        context.putImageData(pixels, 0, 0);
        const crop = document.createElement("canvas"); crop.width = right - left + 1; crop.height = bottom - top + 1;
        const cropContext = crop.getContext("2d"); if (!cropContext) throw new Error("Image conversion unavailable");
        cropContext.drawImage(canvas, left, top, crop.width, crop.height, 0, 0, crop.width, crop.height);
        resolve({ source: crop.toDataURL("image/png"), aspectRatio: crop.width / crop.height });
      } catch { reject(new Error("Packaging logo could not be cropped for thermal printing. Check its saved image.")); }
    }; image.src = source;
  });
  logoCache.set(source, promise); promise.catch(() => logoCache.delete(source)); return promise;
}
export async function preparePackagingThermalLabels(labels: PackagingLabelData[], options: PackagingThermalOptions = {}): Promise<PackagingLabelData[]> {
  if (!selected(options).has("branding")) return labels;
  return Promise.all(labels.map(async label => {
    if (!label.logoUrl || label.thermalLogoAspectRatio) return label;
    const logo = await preparePackagingThermalLogo(label.logoUrl);
    return { ...label, logoUrl: logo.source, thermalLogoAspectRatio: logo.aspectRatio };
  }));
}
export async function generatePackagingThermalPdfBlob(labels: PackagingLabelData[], origin: string, options: PackagingThermalOptions = {}): Promise<Blob> {
  const batch = analyzePackagingThermalBatch(await preparePackagingThermalLabels(labels, options), origin, options);
  if (!batch.fits) { const failed = batch.entries.find(entry => !entry.layout.fits); throw new Error(failed ? `${failed.label.sku}: ${failed.layout.errors.join(" ")}` : "No packaging identities selected."); }
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [50, 25], compress: true });
  for (const [index, entry] of batch.entries.entries()) {
    if (index) doc.addPage([50, 25], "landscape");
    doc.setFillColor(0, 0, 0); doc.setTextColor(0, 0, 0);
    for (const element of entry.layout.elements) {
      if (element.kind === "text") { doc.setFont("helvetica", element.bold ? "bold" : "normal"); doc.setFontSize(element.fontSize); doc.text(element.text, element.x, element.y, { baseline: "top" }); }
      else if (element.kind === "qr") {
        // One lossless black/white image at native printer resolution avoids seams
        // between separately rasterized vector squares in browser/driver printing.
        const png = await QRCode.toDataURL(element.value, { errorCorrectionLevel: "M", margin: 4, scale: 4, color: { dark: "#000000ff", light: "#ffffffff" } });
        doc.addImage(png, "PNG", element.x, element.y, element.width, element.height, undefined, "NONE");
      }
      else if (element.kind === "barcode") { const step = element.width / (element.bits.length + 20); Array.from(element.bits).forEach((bit, i) => { if (bit === "1") doc.rect(element.x + (i + 10) * step, element.y, step, element.height, "F"); }); }
      else doc.addImage(element.source, "PNG", element.x, element.y, element.width, element.height);
    }
  }
  return doc.output("blob");
}
