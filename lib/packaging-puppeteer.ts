
import puppeteer from "puppeteer";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import type { PackagingLabelData } from "./packaging-pdf-generator";

export type { PackagingLabelData };

const MRP_FORMATTER = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatMrpValue(value?: number) {
  if (!Number.isFinite(value)) return "-";
  return MRP_FORMATTER.format(value as number).replace(/\s/g, "");
}

function formatPackingMonthYear(value?: Date | string) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

function formatMfgDate(value?: Date | string) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function buildWatermarkTiles(text: string, opacity: number, rotation: number, fontSize: number) {
  const tiles: string[] = [];
  const stepX = 28;
  const stepY = 16;
  for (let y = 6; y < 50; y += stepY) {
    for (let x = 6; x < 100; x += stepX) {
      tiles.push(
        `<span class="watermark-tile" style="left:${x}mm; top:${y}mm; font-size:${fontSize}pt; transform: rotate(${rotation}deg); opacity:${opacity};">${text}</span>`
      );
    }
  }
  return tiles.join("");
}
export async function generatePackagingPdfPuppeteer(labels: PackagingLabelData[]) {
  // Generate HTML content
  const htmlContent = await generateHtml(labels);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  
  await page.setViewport({ 
    width: 794, 
    height: 1123, 
    deviceScaleFactor: 1 
  }); 

  // Set content
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  // Generate PDF - EXACT USER CONFIG
  const pdfBuffer = await page.pdf({
    width: "210mm",
    height: "297mm",
    printBackground: true,
    scale: 1,
    preferCSSPageSize: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" }
  });

  await browser.close();

  return pdfBuffer;
}

async function generateHtml(labels: PackagingLabelData[]) {
  // Split labels into pages (max 10 per page)
  const pages = [];
  for (let i = 0; i < labels.length; i += 10) {
    pages.push(labels.slice(i, i + 10));
  }

  const pagesHtml = await Promise.all(pages.map(async (pageLabels) => {
    const labelsHtml = await Promise.all(pageLabels.map(label => generateLabelHtml(label)));
    return `
      <div class="a4">
        ${labelsHtml.join("")}
      </div>
    `;
  }));

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          color: #000000;
          -webkit-print-color-adjust: exact;
          letter-spacing: normal;
        }
        
        * {
          letter-spacing: normal;
        }

        .a4 {
          width: 210mm;
          height: 297mm;
          display: grid;
          grid-template-columns: repeat(2, 100mm);
          grid-template-rows: repeat(5, 50mm);
          column-gap: 10mm;
          row-gap: 2mm;
          justify-content: start;
          align-content: start;
          page-break-after: always;
        }

        .a4:last-child {
          page-break-after: avoid;
        }

        .label {
          position: relative;
          width: 378px;
          height: 189px;
          box-sizing: border-box;
          border: 0.1mm solid #c0c0c0;
          background: #ffffff;
          overflow: hidden;
          font-size: 10px;
        }

        /* ZONES */
        .header {
          height: 45px;
          position: relative;
        }

        .body {
          display: flex;
          height: 144px;
        }

        .left {
          flex: 1;
          padding: 6px 12px 40px 12px;
          font-size: 7.8pt;
          overflow: hidden;
        }

        .right {
          width: 95px;
          position: relative;
          text-align: center;
          padding: 8px 12px 0 12px;
          box-sizing: border-box;
        }

        .product { margin-bottom: 2px; }

        .product-block { margin-bottom: 0; }

        .compliance { margin-top: 8px; }

        .address { margin-top: 0; }

        .barcode-zone {
          position: absolute;
          bottom: 24px;
          width: 80%;
          left: 50%;
          transform: translateX(-50%);
          height: 30px;
        }

        .barcode-text {
          position: absolute;
          bottom: 19px;
          width: 80%;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          font-size: 7px;
          font-family: monospace;
          z-index: 3;
        }

        .qr {
          width: 68px;
          height: 68px;
          margin: 0 auto 4px auto;
        }

        .qr-caption {
          text-align: center;
          font-size: 6.5pt;
          line-height: 1.1;
          margin-bottom: 6px;
          color: #222;
        }

        .footer-strip {
          position: absolute;
          bottom: 0;
          height: 18px;
          width: 100%;
          background: #f2f2f2;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ELEMENTS */
        .watermark-grid { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 1; }
        .watermark-tile { position: absolute; color: rgba(0, 0, 0, 0.12); white-space: nowrap; transform-origin: left top; }

        .logo { position: absolute; top: 12px; left: 12px; width: 30px; height: 20px; object-fit: contain; z-index: 2; }
        .est { position: absolute; top: 12px; right: 12px; font-family: Arial, sans-serif; font-size: 8px; color: #222; z-index: 2; }

        /* Content Rows */
        .row-item { font-size: 7.8pt; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2; }
        .row-item strong { font-weight: 600; }
        .headline { font-size: 10px; font-weight: 600; margin-bottom: 3px; white-space: normal; line-height: 1.15; max-height: 2.3em; overflow: hidden; }
        .headline-small { font-size: 9px; }
        
        .serial-block { margin-top: 6px; margin-bottom: 8px; }
        .sku-serial { margin-top: 2px; font-size: 7.5pt; }

        /* Compliance Rows */
        .comp-item { font-size: 7.5pt; line-height: 1.2; z-index: 2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .comp-item + .comp-item { margin-top: 8px; }
        .comp-item strong { font-weight: 600; }
        .alert { font-weight: 600; text-align: center; font-size: 7.2pt; margin: 6px 0; z-index: 2; }

        /* MRP Fix */
        .mrp {
          letter-spacing: 0 !important;
          word-spacing: 0 !important;
          white-space: nowrap;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        /* QR */
        .qr img { width: 100%; height: 100%; object-fit: contain; z-index: 2; }
        
        /* Barcode */
        .barcode-img { width: 100%; height: 100%; object-fit: contain; z-index: 2; }

        /* Footer */
        .micro { font-size: 7px; color: #777; z-index: 2; }
      </style>
    </head>
    <body>
      ${pagesHtml.join("")}
    </body>
    </html>
  `;
}

async function generateLabelHtml(label: PackagingLabelData) {
  const estYear = label.estYear || "1990";
  const watermarkText = label.watermarkText || "Khyati Gems";
  const variant = label.labelVariant === "EXPORT" ? "EXPORT" : "RETAIL";
  const gemstoneName = label.gemstoneName || "Loose Certified Gemstone";
  const stoneTypeValue = label.stoneType || label.category || label.categoryCode || "Natural";
  const weightCarat = label.weightCarat ? label.weightCarat.toFixed(2) : "0.00";
  const toleranceCarat = label.toleranceCarat ?? 0.01;
  const weightRatti = label.weightRatti ? label.weightRatti.toFixed(2) : "-";
  const weightGrams = label.weightGrams ? label.weightGrams.toFixed(2) : "0.00";
  const toleranceGram = label.toleranceGram ?? 0.01;
  const color = label.color || "-";
  const clarityValue = label.clarityGrade || label.clarity || "-";
  const cutValue = label.cutGrade || label.cut || "-";
  const originCountry = label.originCountry || label.origin || "-";
  const sku = label.sku || "-";
  const serialNumber = label.serial || "-";
  const qcCode = label.qcCode || "-";
  const treatment = label.treatment || "-";
  const unitQty = label.unitQuantity ?? 1;
  const certNo = label.certificateNumber || label.certificateNo || "-";
  const hsn = label.hsn || "-";
  const iec = label.iec || "-";
  const madeIn = label.madeIn || "India";
  const exportCountry = madeIn.replace(/^Made in\s*/i, "").trim() || "India";
  const headlineParts = [label.stoneType, originCountry !== "-" ? originCountry : "", gemstoneName].filter(Boolean);
  const headline = headlineParts.length ? headlineParts.join(" ") : gemstoneName;
  const qrPayload = `SKU:${sku}|Serial:${serialNumber}|QC:${qcCode}`;
  const mrpValue = formatMrpValue(label.mrp);
  const packingMonthYear = formatPackingMonthYear(label.packingDate);
  const mfgDate = formatMfgDate(label.packingDate);
  const supportParts = [label.supportEmail, label.supportPhone, label.supportTimings, label.supportWebsite].filter(Boolean);

  const qrLabel = variant === "EXPORT" ? "Verify: khyatigems.com/verify" : "Scan to verify authenticity";
  const watermarkOpacityVal = (label.watermarkOpacity ?? 6) / 100;
  const watermarkRotation = label.watermarkRotation ?? -30;
  const watermarkFontSize = label.watermarkFontSize ?? 16;
  const watermarkHtml =
    watermarkOpacityVal > 0 && watermarkText
      ? `<div class="watermark-grid">${buildWatermarkTiles(watermarkText, watermarkOpacityVal, watermarkRotation, watermarkFontSize)}</div>`
      : "";

  const qrDataUrl = await QRCode.toDataURL(qrPayload, {
    margin: 0,
    width: 100,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const canvas = createCanvas(200, 80);
  JsBarcode(canvas, serialNumber, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  const barcodeDataUrl = canvas.toDataURL();

  const complianceLines: string[] = [];
  if (variant === "EXPORT") {
    // Export Logic - Condensed
    const line1Parts = [];
    if (hsn !== "-") line1Parts.push(`HS: ${hsn}`);
    line1Parts.push(`Exported from: ${exportCountry}`);
    complianceLines.push(`<div class="comp-item">${line1Parts.join(" | ")}</div>`);

    if (label.certificateLab || certNo !== "-") {
      complianceLines.push(`<div class="comp-item"><strong>Cert:</strong> ${label.certificateLab || "-"} | <strong>No:</strong> ${certNo}</div>`);
    }
    
    const complianceParts = [];
    if (iec !== "-") complianceParts.push(`<strong>IEC:</strong> ${iec}`);
    if (label.gstin) complianceParts.push(`<strong>GSTIN:</strong> ${label.gstin}`);
    if (complianceParts.length) {
        complianceLines.push(`<div class="comp-item">${complianceParts.join(" | ")}</div>`);
    }

    const packParts = [`<strong>Qty:</strong> ${unitQty}`];
    if (packingMonthYear !== "-") packParts.push(`<strong>Packed:</strong> ${packingMonthYear}`);
    complianceLines.push(`<div class="comp-item">${packParts.join(" | ")}</div>`);
    if (mfgDate !== "-") complianceLines.push(`<div class="comp-item"><strong>Mfg Date:</strong> ${mfgDate}</div>`);

    // Address Block
    complianceLines.push(`<div class="address">`);
    complianceLines.push(`<div class="comp-item"><strong>Exporter:</strong> Khyati Precious Gems Pvt. Ltd.</div>`);
    complianceLines.push(`<div class="comp-item"><strong>Exported by:</strong> Khyati Precious Gems Pvt. Ltd.</div>`);
    if (label.registeredAddress) complianceLines.push(`<div class="comp-item">${label.registeredAddress}</div>`);
    complianceLines.push(`<div class="comp-item">Made in ${exportCountry}</div>`);
    if (supportParts.length) complianceLines.push(`<div class="comp-item">Support: ${supportParts.join(" | ")}</div>`);
    complianceLines.push(`</div>`);
  } else {
    // Retail Logic
    const line1Parts = [`<strong>Qty:</strong> ${unitQty}`];
    if (packingMonthYear !== "-") line1Parts.push(`<strong>Packed:</strong> ${packingMonthYear}`);
    complianceLines.push(`<div class="comp-item">${line1Parts.join(" | ")}</div>`);

    complianceLines.push(`<div class="comp-item"><strong>MRP (Incl. of All Taxes):</strong> <span class="mrp">₹${mrpValue}</span></div>`);
    if (mfgDate !== "-") complianceLines.push(`<div class="comp-item"><strong>Mfg Date:</strong> ${mfgDate}</div>`);
    
    if (label.gstin) complianceLines.push(`<div class="comp-item"><strong>GSTIN:</strong> ${label.gstin}</div>`);
    
    complianceLines.push(`<div class="alert">*** DO NOT ACCEPT IF SEAL IS BROKEN ***</div>`);
    
    // Address Block
    complianceLines.push(`<div class="address">`);
    complianceLines.push(`<div class="comp-item"><strong>Manufacturer:</strong> Khyati Precious Gems Pvt. Ltd.</div>`);
    if (label.registeredAddress) complianceLines.push(`<div class="comp-item">${label.registeredAddress}</div>`);
    complianceLines.push(`<div class="comp-item">Made in ${exportCountry}</div>`);
    if (supportParts.length) complianceLines.push(`<div class="comp-item">Support: ${supportParts.join(" | ")}</div>`);
    complianceLines.push(`</div>`);
  }

  return `
    <div class="label">
      ${watermarkHtml}
      
      <div class="header">
        ${label.logoUrl ? `<img class="logo" src="${label.logoUrl}" />` : ""}
        <div class="est">Since ${estYear}</div>
      </div>

      <div class="body">
        <div class="left">
          <div class="product">
            <div class="product-block">
                <div class="row-item headline ${headline.length > 28 ? "headline-small" : ""}">${headline}</div>
                <div class="row-item"><strong>Stone Type:</strong> ${stoneTypeValue}</div>
                <div class="row-item"><strong>Weight:</strong> ${weightCarat} CT ±${toleranceCarat}${variant === "RETAIL" ? ` | <strong>Ratti:</strong> ${weightRatti}` : ""}</div>
                <div class="row-item"><strong>Net Weight:</strong> ${weightGrams} g ±${toleranceGram}</div>
                <div class="row-item"><strong>Color:</strong> ${color} | <strong>Clarity:</strong> ${clarityValue} | <strong>Cut:</strong> ${cutValue}</div>
                <div class="row-item"><strong>Treatment:</strong> ${treatment}</div>
                <div class="serial-block">
                  <div class="row-item sku-serial">SKU: ${sku}</div>
                  <div class="row-item sku-serial">${variant === "EXPORT" ? "Serial" : "Serial No"}: ${serialNumber}</div>
                </div>
            </div>
          </div>

          <div class="compliance">
            ${complianceLines.join("")}
          </div>
        </div>

        <div class="right">
          <div class="qr">
            <img src="${qrDataUrl}" />
          </div>
          <div class="qr-caption">${qrLabel}</div>
        </div>
      </div>
      <div class="barcode-zone">
        <img class="barcode-img" src="${barcodeDataUrl}" />
      </div>
      <div class="barcode-text">${serialNumber}</div>

      <div class="footer-strip">
        <div class="micro">${label.microBorderText || "KHYATI GEMS AUTHENTIC PRODUCT"}</div>
      </div>
    </div>
  `;
}
