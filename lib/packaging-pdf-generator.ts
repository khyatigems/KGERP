import jsPDF from "jspdf";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

const MRP_FORMATTER = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Font definitions
const FONTS: Record<string, { normal: string; bold: string; italic?: string; bolditalic?: string }> = {
  "poppins": {
    normal: "https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecg.ttf",
    bold: "https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFQ.ttf",
    italic: "https://fonts.gstatic.com/s/poppins/v20/pxiGyp8kv8JHgFVrJJLucHtF.ttf",
    bolditalic: "https://fonts.gstatic.com/s/poppins/v20/pxiDyp8kv8JHgFVrJJLmy1zlFPE.ttf"
  }
};

const STANDARD_FONTS = new Set(["helvetica", "times", "courier", "symbol", "zapfdingbats"]);

const loadedFonts = new Set<string>();

function arrayBufferToBinaryString(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

async function loadFont(doc: jsPDF, family: string) {
  if (loadedFonts.has(family)) return;
  const fontDef = FONTS[family];
  if (!fontDef) return;

  try {
    // Try loading normal and bold. Italic is optional.
    const promises = [
      fetch(fontDef.normal).then(r => r.ok ? r.arrayBuffer() : null),
      fetch(fontDef.bold).then(r => r.ok ? r.arrayBuffer() : null),
    ];
    
    if (fontDef.italic) promises.push(fetch(fontDef.italic).then(r => r.ok ? r.arrayBuffer() : null));
    if (fontDef.bolditalic) promises.push(fetch(fontDef.bolditalic).then(r => r.ok ? r.arrayBuffer() : null));

    const results = await Promise.all(promises);
    const [normBuf, boldBuf, italicBuf, boldItalicBuf] = results;

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
  } catch (e) {
    console.warn(`Failed to load font ${family}, falling back to standard fonts`, e);
    // Do not throw, just continue. jsPDF will use default font if custom font not found.
  }
}

export type PackagingFieldId =
  | "header"
  | "footer"
  | "qr"
  | "barcode"
  | "price"
  | "origin"
  | "weight";

export type PackagingSheetLayout = {
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  gapXmm: number;
  gapYmm: number;
  offsetXmm: number;
  offsetYmm: number;
  startPosition: number;
};

export type PackagingRenderOptions = {
  selectedFields: PackagingFieldId[];
  drawGuides?: boolean;
  drawCellNumbers?: boolean;
  itemsPerLabel?: number;
};

export interface PackagingLabelData {
  serial: string;
  sku: string;
  batchId?: string;
  gemstoneName: string;
  stoneType: string;
  condition: string;
  weightCarat: number;
  weightRatti?: number;
  weightGrams: number;
  category?: string;
  categoryCode?: string;
  dimensionsMm?: string;
  color?: string;
  clarity?: string;
  clarityGrade?: string;
  cut?: string;
  cutGrade?: string;
  treatment: string;
  origin?: string;
  originCountry?: string;
  cutPolishedIn?: string;
  certificateLab?: string;
  certificateNo?: string;
  certificateNumber?: string;
  mrp: number;
  hsn: string;
  gstin?: string;
  iec?: string;
  registeredAddress?: string;
  qcCode?: string;
  inventoryLocation?: string;
  packingDate?: Date | string;
  printJobId?: string;
  unitQuantity?: number;
  declaredOriginal?: boolean;
  brandName?: string;
  tagline?: string;
  estYear?: string;
  logoUrl?: string;
  careInstruction?: string;
  legalMetrology?: string;
  supportEmail?: string;
  supportPhone?: string;
  supportTimings?: string;
  supportWebsite?: string;
  watermarkText?: string;
  watermarkOpacity?: number;
  watermarkRotation?: number;
  watermarkFontFamily?: string;
  watermarkFontSize?: number;
  microBorderText?: string;
  toleranceCarat?: number;
  toleranceGram?: number;
  labelVariant?: "RETAIL" | "EXPORT";
  labelVersion?: string;
  madeIn?: string;
  shape?: string;
}

async function makeQrPng(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, errorCorrectionLevel: "M" });
}

function makeBarcodePng(text: string): string {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL("image/png");
}

function formatMrpValue(value?: number) {
  if (!Number.isFinite(value)) return "-";
  return MRP_FORMATTER.format(value as number).replace(/\s/g, "");
}



export async function generatePackagingPdfBlob(
  labels: PackagingLabelData[],
  layout: PackagingSheetLayout,
  options: PackagingRenderOptions
): Promise<Blob> {
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [layout.pageWidthMm, layout.pageHeightMm],
    });

    // Pre-load fonts if any label uses them
    const neededFonts = new Set<string>();
    labels.forEach(l => {
      if (l.watermarkFontFamily) {
        const wf = l.watermarkFontFamily.toLowerCase();
        if (!STANDARD_FONTS.has(wf) && FONTS[wf]) neededFonts.add(wf);
      }
    });

    for (const font of neededFonts) {
      await loadFont(doc, font);
    }

    const perPage = layout.cols * layout.rows;
    const startPosIndex = Math.max(0, (layout.startPosition || 1) - 1);
    const ipp = Math.max(1, options.itemsPerLabel ?? 1);

    // Chunk labels into groups for multi-item mode
    const chunks: PackagingLabelData[][] = [];
    for (let i = 0; i < labels.length; i += ipp) {
      chunks.push(labels.slice(i, i + ipp));
    }

    const totalCellsNeeded = startPosIndex + chunks.length;
    const pages = Math.max(1, Math.ceil(totalCellsNeeded / perPage));

    for (let page = 0; page < pages; page++) {
      if (page > 0) doc.addPage();

      for (let cell = 0; cell < perPage; cell++) {
        const absoluteCell = page * perPage + cell;
        const r = Math.floor(cell / layout.cols);
        const c = cell % layout.cols;

        const x = layout.marginLeftMm + layout.offsetXmm + c * (layout.labelWidthMm + layout.gapXmm);
        const y = layout.marginTopMm + layout.offsetYmm + r * (layout.labelHeightMm + layout.gapYmm);

        if (options.drawGuides) {
          doc.setDrawColor(220);
          doc.setLineWidth(0.1);
          doc.rect(x, y, layout.labelWidthMm, layout.labelHeightMm);
        }

        if (options.drawCellNumbers) {
          doc.setTextColor(120);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.text(String(absoluteCell + 1), x + 3, y + 6);
        }

        const chunkIndex = absoluteCell - startPosIndex;
        if (chunkIndex < 0 || chunkIndex >= chunks.length) continue;

        const chunk = chunks[chunkIndex];

        if (ipp > 1) {
          await renderMultiItemLabel(doc, chunk, x, y, layout.labelWidthMm, layout.labelHeightMm, options);
        } else {
          await renderLabel(doc, chunk[0], x, y, layout.labelWidthMm, layout.labelHeightMm, options);
        }
      }
    }

    return doc.output("blob");
  } catch (err) {
    console.error("PDF Generation Error:", err);
    throw err;
  }
}

export async function generatePackagingTestSheetBlob(layout: PackagingSheetLayout): Promise<Blob> {
  return generatePackagingPdfBlob([], layout, {
    selectedFields: [],
    drawGuides: true,
    drawCellNumbers: true,
  });
}

export function createObjectUrl(blob: Blob) {
  return URL.createObjectURL(blob);
}

function hasField(options: PackagingRenderOptions, id: PackagingFieldId) {
  return options.selectedFields.includes(id);
}

async function renderLabel(
  doc: jsPDF,
  data: PackagingLabelData,
  x: number,
  y: number,
  w: number,
  h: number,
  options: PackagingRenderOptions
) {
  const PAD = 2; // Tighter padding
  const innerX = x + PAD;

  const variant = data.labelVariant === "EXPORT" ? "EXPORT" : "RETAIL";

  // -----------------------------
  // LAYOUT CALCULATIONS
  // -----------------------------
  // Visual Structure based on Reference:
  // 1. Header: Logo (Top Left). No Text.
  // 2. Main Content (Below Header):
  //    - Left (70%): Product Details Rows
  //    - Right (30%): QR Code + Verify Text
  // 3. Footer:
  //    - Barcode + Legal Text + Support
  //    - Bottom Strip Pattern

  const HEADER_H = 8;
  const FOOTER_STRIP_H = 3;
  const LEGAL_H = 15; // Kept at 15 to allow more body space
  
  const contentY = y + HEADER_H;
  
  const COL_SPLIT = 0.72; // 72% Left, 28% Right
  const colSplitX = x + (w * COL_SPLIT);
  
  // -----------------------------
  // DRAW ZONES & BORDERS
  // -----------------------------
  doc.setDrawColor(50); // Dark Grey
  doc.setLineWidth(0.1);
  
  // Outer Border
  doc.rect(x, y, w, h);
  
  // Divider Lines
  // 1. Header Separator
  doc.setDrawColor(200);
  doc.line(x, contentY, x + w, contentY);

  // 2. Footer Separator
  const footerY = y + h - LEGAL_H - FOOTER_STRIP_H;
  doc.line(x, footerY, x + w, footerY);

  // -----------------------------
  // 1. HEADER (LOGO ONLY)
  // -----------------------------
  if (data.logoUrl) {
    try {
      doc.addImage(data.logoUrl, "PNG", innerX, y + 1, 0, 6, undefined, 'FAST');
    } catch {}
  }
  
  // Est Year (Right aligned in header)
  if (data.estYear) {
    doc.setFont("times", "bolditalic");
    doc.setFontSize(6); // Reduced from 7
    doc.setTextColor(50);
    doc.text(`Est. ${data.estYear}`, x + w - PAD, y + 5, { align: "right" });
    doc.setTextColor(0);
  }

  // -----------------------------
  // 2. MAIN CONTENT
  // -----------------------------
  
  // --- LEFT COLUMN (DETAILS) ---
  let textY = contentY + 3; // Reduced top margin (was +4)
  const leftX = innerX;
  
  // Title (Gemstone Name)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8); // Reduced from 9
  doc.text(data.gemstoneName || "Gemstone", leftX, textY);
  textY += 2.8; // Reduced spacing (was 3)

  // New Row: Product Type / Category
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5); // Reduced from 6.5
  doc.text(`Product Type: ${data.category || "Loose Gemstone"}`, leftX, textY);
  textY += 2.5; // Reduced spacing (was 3)

  // Row 1: Type | Condition
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.5); // Reduced from 6.5
  doc.text(`Stone Type: `, leftX, textY);
  doc.setFont("helvetica", "bold");
  const typeW = doc.getTextWidth(`Stone Type: `);
  doc.text(`${data.stoneType}`, leftX + typeW, textY);
  
  // Condition
  const condLabel = " | Condition: ";
  const condX = leftX + typeW + doc.getTextWidth(data.stoneType) + 1;
  doc.setFont("helvetica", "normal");
  doc.text(condLabel, condX, textY);
  doc.setFont("helvetica", "bold");
  doc.text(data.condition || "New", condX + doc.getTextWidth(condLabel), textY);
  textY += 2.5; // Reduced spacing (was 3)

  // Row 2: Weight & Ratti
  const wText1 = `${data.weightCarat.toFixed(2)} CT`;
  const wText2 = data.weightRatti ? ` | ${data.weightRatti.toFixed(2)} Ratti` : "";
  const wText3 = ` | Net Wt: ${data.weightGrams.toFixed(3)} g`;
  const wText4 = ` | Unit: ${data.unitQuantity ?? 1}`;
  
  doc.setFont("helvetica", "bold");
  doc.text(`${wText1}${wText2}${wText3}${wText4}`, leftX, textY);
  textY += 2.5; // Reduced spacing (was 3)

  // Row 3: Color | Clarity | Cut
  doc.setFont("helvetica", "normal");
  doc.text("Color: ", leftX, textY);
  let curX = leftX + doc.getTextWidth("Color: ");
  doc.setFont("helvetica", "bold");
  doc.text(data.color || "-", curX, textY);
  curX += doc.getTextWidth(data.color || "-");
  
  doc.setFont("helvetica", "normal");
  doc.text(" | Shape: ", curX, textY);
  curX += doc.getTextWidth(" | Shape: ");
  doc.setFont("helvetica", "bold");
  doc.text(data.shape || "-", curX, textY);
  curX += doc.getTextWidth(data.shape || "-");

  doc.setFont("helvetica", "normal");
  doc.text(" | Cut: ", curX, textY);
  curX += doc.getTextWidth(" | Cut: ");
  doc.setFont("helvetica", "bold");
  doc.text(data.cutGrade || data.cut || "-", curX, textY);
  textY += 2.5; // Reduced spacing (was 3)

  // Row 4: Origin
  doc.setFont("helvetica", "normal");
  doc.text("Origin: ", leftX, textY);
  doc.setFont("helvetica", "bold");
  doc.text(data.origin || data.originCountry || "-", leftX + doc.getTextWidth("Origin: "), textY);
  textY += 2.8; // Reduced spacing (was 3)

  // Row 5: SKU (Serial removed from body as per request)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5); // Reduced from 7.5
  doc.text(`SKU: ${data.sku}`, leftX, textY);
  textY += 2.5; // Reduced spacing (was 3)

  // Row 6: HSN | GSTIN | IEC logic
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5); // Reduced from 5.5
  let legalLine = "";
  if (data.hsn) legalLine += `HSN: ${data.hsn}`;
  if (data.gstin) legalLine += ` | GSTIN: ${data.gstin}`;
  // Only show IEC if NOT Retail (i.e. Export)
  if (variant === "EXPORT" && data.iec) legalLine += ` | IEC: ${data.iec}`;
  doc.text(legalLine, leftX, textY);
  textY += 2.2; // Reduced spacing (was 2.8)

  // Row 7: Made in India
  const packedDate = data.packingDate 
    ? new Date(data.packingDate).toLocaleString("en-IN", { month: "short", year: "numeric" }) // MMM YYYY format
    : "-";
  doc.text(`Made in India | Pkd: ${packedDate}`, leftX, textY);


  // --- RIGHT COLUMN (QR) ---
  const rightX = colSplitX + 1;
  const rightW = innerX + w - (PAD * 2) - colSplitX; // Remaining width
  const qrSize = 14; // Reduced from 16 to match smaller content
  
  if (hasField(options, "qr")) {
    try {
      const qrText = `https://erp.khyatigems.com/verify/${data.serial}`;
      const qr = await makeQrPng(qrText);
      
      const qrY = contentY + 2; // Reduced top margin
      const qrXCentered = rightX + (rightW - qrSize) / 2;
      
      doc.addImage(qr, "PNG", qrXCentered, qrY, qrSize, qrSize);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5); // Reduced from 5.5
      doc.text("Scan to verify", rightX + rightW/2, qrY + qrSize + 2, { align: "center" });
      
    } catch {}
  }

  // -----------------------------
  // 3. FOOTER (BARCODE & LEGAL)
  // -----------------------------
  const fY = footerY + 2; // Reduced margin (was 2.2)
  
  // Barcode (Right aligned)
  const barcodeW = 24; // Reduced from 28
  const barcodeH = 4; // Reduced from 4.5
  
  // Legal Text (Left side) - Ensure it doesn't hit barcode
  const legalMaxW = w - (PAD * 2) - barcodeW - 2; 
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4); // Reduced from 4.5
  doc.setTextColor(80);
  
  let legalY = fY;
  
  // Helper to draw limited width text
  const drawLegal = (txt: string, isBold = false) => {
      doc.setFont("helvetica", isBold ? "bold" : "normal");
      const splitTxt = doc.splitTextToSize(txt, legalMaxW);
      doc.text(splitTxt, innerX, legalY);
      legalY += (splitTxt.length * 1.8); // Reduced leading (was 2)
  };
  
  // New Footer Structure
  doc.setTextColor(0); // Black for warning
  
  // Stylized warning as requested - Centered and Bold
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5); // Slightly larger for emphasis
  const warningText = "*** DO NOT ACCEPT IF SEAL IS BROKEN ***";
  // Center within the legal area (left side of footer)
  const legalAreaCenter = innerX + (legalMaxW / 2);
  doc.text(warningText, legalAreaCenter, legalY, { align: "center" });
  legalY += 2.5; // Spacing after warning

  doc.setFontSize(4); // Back to normal legal size
  doc.setTextColor(80); // Grey for rest
  drawLegal("Packed & Labeled as per Legal Metrology Rules");
  drawLegal("Handle with care, Avoid chemicals & impact");
  
  // Mfg Details
  drawLegal("Mfd By: Khyati Precious Gems Pvt. Ltd.", true);
  if (data.registeredAddress) {
      drawLegal(data.registeredAddress);
  }
  
  // Support Info
  const supportText = `support@khyatigems.com | www.khyatigems.com`;
  drawLegal(supportText, true);
  
  // Barcode (Positioned at Top Right of Footer area)
  if (hasField(options, "barcode")) {
    try {
      const bar = makeBarcodePng(data.serial);
      const barX = x + w - barcodeW - PAD;
      doc.addImage(bar, "PNG", barX, footerY + 2, barcodeW, barcodeH);
      
      doc.setFont("courier", "normal");
      doc.setFontSize(4); // Reduced from 4.5
      doc.text(data.serial, barX + barcodeW/2, footerY + 2 + barcodeH + 2, { align: "center" });
      
      // MRP for Retail (Add below barcode)
      if (variant === "RETAIL") {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6); // Reduced from 6.5
          doc.text(`MRP: Rs. ${formatMrpValue(data.mrp)}`, barX + barcodeW/2, footerY + 2 + barcodeH + 4, { align: "center" });
      }
    } catch {}
  }

  // -----------------------------
  // 4. BOTTOM STRIP
  // -----------------------------
  const stripY = y + h - FOOTER_STRIP_H;
  doc.setFillColor(240, 240, 240); 
  doc.rect(x, stripY, w, FOOTER_STRIP_H, "F");
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5); // Reduced from 5
  doc.setTextColor(150);
  const patternText = "KhyatiGems™ AUTHENTIC PRODUCT  ".repeat(3); // More repeats for smaller font
  doc.text(patternText, x + w/2, stripY + 2, { align: "center" });
  doc.setTextColor(0);
}

// ---------------------------------------------------------------------------
// MULTI-ITEM LABEL RENDERER (2 or 3 items per 100×50mm label)
// ---------------------------------------------------------------------------

function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + "…") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.length < text.length ? truncated + "…" : truncated;
}

async function renderMultiItemLabel(
  doc: jsPDF,
  items: PackagingLabelData[],
  x: number,
  y: number,
  w: number,
  h: number,
  options: PackagingRenderOptions
) {
  const PAD = 2;
  const innerX = x + PAD;
  const itemCount = items.length;

  // Zone heights (same as single-item)
  const HEADER_H = 8;
  const FOOTER_STRIP_H = 3;
  const LEGAL_H = 15;

  const contentY = y + HEADER_H;
  const footerY = y + h - LEGAL_H - FOOTER_STRIP_H;
  const contentH = footerY - contentY;

  // QR sits on the right, same size as single-item
  const COL_SPLIT = 0.72;
  const colSplitX = x + (w * COL_SPLIT);
  const rightX = colSplitX + 1;
  const rightW = innerX + w - (PAD * 2) - colSplitX;
  const qrSize = 14;

  // Row layout
  const rowH = contentH / itemCount;
  const fontSize = itemCount <= 2 ? 6 : 5;
  const nameFontSize = itemCount <= 2 ? 6.5 : 5.5;

  // -----------------------------
  // DRAW ZONES & BORDERS
  // -----------------------------
  doc.setDrawColor(50);
  doc.setLineWidth(0.1);
  doc.rect(x, y, w, h);

  doc.setDrawColor(200);
  doc.line(x, contentY, x + w, contentY);
  doc.line(x, footerY, x + w, footerY);

  // -----------------------------
  // 1. HEADER (LOGO ONLY)
  // -----------------------------
  if (items[0].logoUrl) {
    try {
      doc.addImage(items[0].logoUrl, "PNG", innerX, y + 1, 0, 6, undefined, "FAST");
    } catch {}
  }

  if (items[0].estYear) {
    doc.setFont("times", "bolditalic");
    doc.setFontSize(6);
    doc.setTextColor(50);
    doc.text(`Est. ${items[0].estYear}`, x + w - PAD, y + 5, { align: "right" });
    doc.setTextColor(0);
  }

  // -----------------------------
  // 2. ITEM ROWS (COMPACT)
  // -----------------------------
  const maxTextW = (colSplitX - innerX) - 2;
  const variant = items[0].labelVariant === "EXPORT" ? "EXPORT" : "RETAIL";

  for (let i = 0; i < itemCount; i++) {
    const item = items[i];
    const rowY = contentY + i * rowH;
    const textBaseY = rowY + rowH / 2 + 1.2;

    // Item number
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameFontSize);
    doc.text(`${i + 1}.`, innerX, textBaseY);

    let curX = innerX + doc.getTextWidth(`${i + 1}. `);

    // Gemstone Name (truncated)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(nameFontSize);
    const nameMaxW = maxTextW * 0.30;
    const displayName = truncateText(doc, item.gemstoneName || "Gemstone", nameMaxW);
    doc.text(displayName, curX, textBaseY);
    curX += doc.getTextWidth(displayName) + 1.5;

    // SKU (full width, no truncation)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    doc.text(item.sku, curX, textBaseY);
    curX += doc.getTextWidth(item.sku) + 1.5;

    // Weight
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    const wText = `${item.weightCarat.toFixed(2)}ct`;
    doc.text(wText, curX, textBaseY);
    curX += doc.getTextWidth(wText) + 1.5;

    // Price (full number format)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(fontSize);
    const priceText = `Rs. ${formatMrpValue(item.mrp)}`;
    doc.text(priceText, curX, textBaseY);

    // Divider line (except after last item)
    if (i < itemCount - 1) {
      doc.setDrawColor(220);
      doc.setLineWidth(0.05);
      doc.line(innerX, rowY + rowH, colSplitX - 1, rowY + rowH);
    }
  }

  // -----------------------------
  // 3. QR CODE (ALL ITEMS)
  // -----------------------------
  if (hasField(options, "qr")) {
    try {
      const allSerials = items.map(it => it.serial).join(",");
      const qrText = `https://erp.khyatigems.com/verify/${allSerials}`;
      const qr = await makeQrPng(qrText);
      const qrY = contentY + 2;
      const qrXCentered = rightX + (rightW - qrSize) / 2;
      doc.addImage(qr, "PNG", qrXCentered, qrY, qrSize, qrSize);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.text("Scan to verify", rightX + rightW / 2, qrY + qrSize + 2, { align: "center" });
    } catch {}
  }

  // -----------------------------
  // 4. FOOTER (BARCODE & LEGAL)
  // -----------------------------
  const fY = footerY + 2;
  const barcodeW = 24;
  const barcodeH = 4;
  const legalMaxW = w - (PAD * 2) - barcodeW - 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4);
  doc.setTextColor(80);

  let legalY = fY;

  const drawLegal = (txt: string, isBold = false) => {
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    const splitTxt = doc.splitTextToSize(txt, legalMaxW);
    doc.text(splitTxt, innerX, legalY);
    legalY += splitTxt.length * 1.8;
  };

  // Warning
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5);
  const warningText = "*** DO NOT ACCEPT IF SEAL IS BROKEN ***";
  const legalAreaCenter = innerX + legalMaxW / 2;
  doc.text(warningText, legalAreaCenter, legalY, { align: "center" });
  legalY += 2.5;

  doc.setFontSize(4);
  doc.setTextColor(80);
  drawLegal("Packed & Labeled as per Legal Metrology Rules");
  drawLegal("Handle with care, Avoid chemicals & impact");
  drawLegal("Mfd By: Khyati Precious Gems Pvt. Ltd.", true);

  if (items[0].registeredAddress) {
    drawLegal(items[0].registeredAddress);
  }

  drawLegal("support@khyatigems.com | www.khyatigems.com", true);

  // Barcode (first item serial)
  if (hasField(options, "barcode")) {
    try {
      const bar = makeBarcodePng(items[0].serial);
      const barX = x + w - barcodeW - PAD;
      doc.addImage(bar, "PNG", barX, footerY + 2, barcodeW, barcodeH);

      doc.setFont("courier", "normal");
      doc.setFontSize(4);
      doc.text(items[0].serial, barX + barcodeW / 2, footerY + 2 + barcodeH + 2, { align: "center" });

      // MRP total for Retail
      if (variant === "RETAIL") {
        const totalMrp = items.reduce((sum, it) => sum + (it.mrp || 0), 0);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.text(`MRP: Rs. ${formatMrpValue(totalMrp)}`, barX + barcodeW / 2, footerY + 2 + barcodeH + 4, { align: "center" });
      }
    } catch {}
  }

  // -----------------------------
  // 5. BOTTOM STRIP
  // -----------------------------
  const stripY = y + h - FOOTER_STRIP_H;
  doc.setFillColor(240, 240, 240);
  doc.rect(x, stripY, w, FOOTER_STRIP_H, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(150);
  const patternText = "KhyatiGems™ AUTHENTIC PRODUCT  ".repeat(3);
  doc.text(patternText, x + w / 2, stripY + 2, { align: "center" });
  doc.setTextColor(0);
}
