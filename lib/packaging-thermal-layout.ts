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
  fits: boolean; fontSize: number; qrSize: number; elements: PackagingThermalElement[];
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
const clean = (value: unknown) => String(value ?? "").replace(/₹/g, "Rs. ").replace(/\s+/g, " ").trim();
const number = (value: number | undefined, places: number) => Number.isFinite(value) ? value!.toFixed(places) : "-";

/** Thermal essentials only. Full historical identity data and sticker rendering stay unchanged. */
export function packagingThermalBlocks(data: PackagingLabelData): PackagingThermalBlock[] {
  const retail = data.labelVariant !== "EXPORT";
  return [
    { field: "brand", text: data.brandName || "KhyatiGems", bold: true },
    // Keep the complete saved name; never strip lab-grown, synthetic or imitation disclosure.
    { field: "name", text: data.gemstoneName || data.stoneType || "Gemstone", bold: true },
    { field: "weight", text: `${number(data.weightCarat, 2)} ct | Qty ${data.unitQuantity ?? 1}`, bold: true },
    { field: "sku", text: data.sku, bold: true },
    { field: "treatment", text: `Treatment: ${data.treatment || "Not recorded"}` },
    ...(retail ? [{ field: "price", text: `MRP Rs. ${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(data.mrp)} (incl. all taxes)`, bold: true }]
      : [{ field: "origin", text: `Gem origin: ${data.originCountry || data.origin || "Not recorded"}` }]),
    { field: "reference", text: `ID ${data.serial}` },
  ].map(block => ({ ...block, text: clean(block.text) }));
}

function makePage(data: PackagingLabelData, origin: string, fontSize: number): PackagingThermalLayout {
  const blocks = packagingThermalBlocks(data);
  const elements: PackagingThermalElement[] = [], errors: string[] = [], overflow: string[] = [];
  const warnings: string[] = [];
  const doc = new jsPDF({ unit: "mm" });
  const measure = (text: string, size: number, bold: boolean) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); return doc.getTextWidth(text); };
  let qrSize = 0, qrX = PACKAGING_THERMAL_WIDTH - MARGIN, qrBottom = MARGIN;
  {
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
  for (const block of blocks) {
    if (block.text.length > 2000) { errors.push(`${block.field} is too long. Use the larger sticker format.`); continue; }
    if (/[^\x20-\x7e\xa0-\xff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/.test(block.text)) errors.push(`${block.field} contains characters unavailable in the thermal font. Use the sticker format or a supported saved spelling.`);
    const size = fontSize + (["brand", "name", "weight"].includes(block.field) ? .5 : 0);
    const height = size * 25.4 / 72 * 1.08;
    let remaining = block.text;
    while (remaining) {
      const availableWidth = (y < qrBottom ? qrX - GAP : PACKAGING_THERMAL_WIDTH - MARGIN) - MARGIN;
      let low = 1, high = remaining.length;
      while (low <= high) { const mid = Math.floor((low + high) / 2); if (measure(remaining.slice(0, mid), size, Boolean(block.bold)) <= availableWidth) low = mid + 1; else high = mid - 1; }
      let end = Math.max(1, high);
      if (end < remaining.length) { const space = remaining.lastIndexOf(" ", end); if (space > 0) end = space; }
      const line = remaining.slice(0, end).trimEnd(), lineWidth = measure(line, size, Boolean(block.bold));
      if (y + height <= 24.001 && lineWidth <= availableWidth + .001) elements.push({ kind: "text", field: block.field, text: line, x: MARGIN, y, width: lineWidth, height, fontSize: size, bold: Boolean(block.bold) });
      else overflow.push(line);
      y += height;
      remaining = remaining.slice(end).trimStart();
    }
    y += .22;
  }
  if (overflow.length) errors.push(`${overflow.length} lines exceed this label at the readable ${PACKAGING_THERMAL_MIN_FONT} pt minimum. Use the larger sticker format; required text is not truncated.`);
  if (!Number.isFinite(data.weightCarat) || data.weightCarat <= 0) errors.push("Save a valid positive gemstone weight before printing.");
  if (data.labelVariant !== "EXPORT" && (!Number.isFinite(data.mrp) || data.mrp < 0)) errors.push("Save a valid retail MRP before printing.");
  if (!data.sku?.trim() || !data.serial?.trim()) errors.push("SKU and packaging serial are required for traceability.");
  if (!Number.isInteger(data.unitQuantity ?? 1) || (data.unitQuantity ?? 1) <= 0) errors.push("Package quantity must be a positive whole number.");
  return { fits: !errors.length, fontSize, qrSize, elements, blocks, overflow, errors, warnings, pageTitle: data.labelVariant === "EXPORT" ? "International gemstone identity" : "Retail gemstone identity" };
}
export function analyzePackagingThermal(data: PackagingLabelData, origin: string): PackagingThermalLayout {
  let result = makePage(data, origin, 7);
  for (let size = 6.75; !result.fits && result.overflow.length && size >= PACKAGING_THERMAL_MIN_FONT; size -= .25) result = makePage(data, origin, size);
  return result;
}
export function analyzePackagingThermalBatch(labels: PackagingLabelData[], origin: string): PackagingThermalBatch {
  const entries = labels.map(label => ({ label, layout: analyzePackagingThermal(label, origin) }));
  return { fits: entries.length > 0 && entries.every(entry => entry.layout.fits), entries };
}


const logoCache = new Map<string, Promise<string>>();
async function monochromeLogo(source: string): Promise<string> {
  if (source.startsWith("data:image/png")) return source;
  const cached = logoCache.get(source); if (cached) return cached;
  const promise = new Promise<string>((resolve, reject) => {
    if (typeof document === "undefined") { reject(new Error("The packaging logo must be loaded in a browser before thermal printing.")); return; }
    const image = new Image(); image.crossOrigin = "anonymous";
    const timer = setTimeout(() => reject(new Error("Packaging logo timed out. Check its saved image URL; no identity graphics have been removed.")), 5000);
    image.onerror = () => { clearTimeout(timer); reject(new Error("Packaging logo could not load. Check its saved image URL.")); };
    image.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 160;
        const context = canvas.getContext("2d"); if (!context) throw new Error("Image conversion unavailable");
        context.fillStyle = "white"; context.fillRect(0, 0, 160, 160);
        const scale = Math.min(160 / image.width, 160 / image.height);
        context.drawImage(image, (160 - image.width * scale) / 2, (160 - image.height * scale) / 2, image.width * scale, image.height * scale);
        const pixels = context.getImageData(0, 0, 160, 160);
        for (let i = 0; i < pixels.data.length; i += 4) { const value = pixels.data[i] * .299 + pixels.data[i + 1] * .587 + pixels.data[i + 2] * .114 < 185 ? 0 : 255; pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; }
        context.putImageData(pixels, 0, 0); resolve(canvas.toDataURL("image/png"));
      } catch { reject(new Error("Packaging logo could not be converted for thermal printing.")); }
    }; image.src = source;
  });
  logoCache.set(source, promise); promise.catch(() => logoCache.delete(source)); return promise;
}
export async function generatePackagingThermalPdfBlob(labels: PackagingLabelData[], origin: string): Promise<Blob> {
  const batch = analyzePackagingThermalBatch(labels, origin);
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
      else doc.addImage(await monochromeLogo(element.source), "PNG", element.x, element.y, element.width, element.height);
    }
  }
  return doc.output("blob");
}
