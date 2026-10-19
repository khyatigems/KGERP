import { analyzeThermalLabel, suggestThermalFieldRemovals, buildThermalQrValue, type ThermalLabelLayout } from "@/lib/thermal-label-layout";
import { toLabelItem } from "@/lib/label-items";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertCollisionFree(layout: ThermalLabelLayout, width = 50, height = 25) {
  for (const [index, element] of layout.elements.entries()) {
    assert(element.x >= 1.499 && element.y >= 1.499 && element.x + element.width <= width - 1.499 && element.y + element.height <= height - 1.499, `${element.field} must remain inside the safe label edges`);
    for (const other of layout.elements.slice(index + 1)) {
      const horizontal = Math.min(element.x + element.width, other.x + other.width) - Math.max(element.x, other.x);
      const vertical = Math.min(element.y + element.height, other.y + other.height) - Math.max(element.y, other.y);
      assert(horizontal <= 0.001 || vertical <= 0.001, `${element.field} must never overlap ${other.field}, even when printing is blocked`);
    }
  }
}

const item = {
  id: "unit-test", sku: "KG-12345-ABC", itemName: "Certified Yellow Sapphire Loose Oval Cut Premium Quality Gemstone",
  internalName: "Internal Ref XYZ-999", gemType: "Sapphire", color: "Yellow",
  weightValue: 5.23, weightUnit: "ct", weightRatti: 4.72, shape: "Oval",
  dimensions: "8.5 x 7.1 x 4.4", stockLocation: "Safe B-12",
  sellingPrice: 152000, pricingMode: "FLAT", sellingRatePerCarat: 29063,
  priceWithChecksum: "1520006", checksumDigit: 6,
};

const ORIGIN = "https://erp.khyatigems.com";
const BASE_CONFIG = {
  pageSize: "THERMAL" as const, rows: 1, cols: 1, marginTop: 0, marginLeft: 0,
  horizontalGap: 0, verticalGap: 0, labelWidth: 50, labelHeight: 25,
  showPrice: false, showEncodedPrice: false, includeChecksumInR: true, qrSize: 12, fontSize: 8,
};

function run() {
  const essentials = ["itemName", "sku", "weight", "qrCode"];
  const allFields = ["itemName", "internalName", "sku", "weight", "gemType", "color", "shape", "dimensions", "stockLocation", "price", "qrCode"];

  const essentialLayout = analyzeThermalLabel(item, { ...BASE_CONFIG, selectedFields: essentials }, buildThermalQrValue(item.sku, ORIGIN));
  assert(essentialLayout.fits, "Essential fields must fit on a 50x25 mm Exeo 9250 label");
  assert(essentialLayout.availableHeight === 22, "25 mm label minus 2x1.5 mm safe margin leaves 22 mm printable height");
  assert(essentialLayout.usedHeight <= essentialLayout.availableHeight, "Used height must not exceed printable height");

  const crowded = analyzeThermalLabel(item, { ...BASE_CONFIG, selectedFields: allFields }, buildThermalQrValue(item.sku, ORIGIN));
  assert(!crowded.fits, "All fields selected must not fit on 50x25 mm");
  assert(crowded.issues.some(issue => issue.severity === "error"), "Overflowing text must raise fitting errors with the field name");
  assert(crowded.elements.some(el => el.kind === "qr" && el.path.length > 0), "QR element must carry drawable module path data");

  const removals = suggestThermalFieldRemovals([item], { ...BASE_CONFIG, selectedFields: allFields }, ORIGIN);
  assert(removals.length > 0, "Overflowing labels must receive suggested field removals");
  for (const protectedField of ["itemName", "sku", "weight", "price", "qrCode"]) {
    assert(!removals.includes(protectedField), `Suggestions must never remove the protected field ${protectedField}`);
  }

  // Auto-fit: oversized font is stepped down instead of forcing field removal.
  const bigFont = analyzeThermalLabel(item, { ...BASE_CONFIG, fontSize: 10, selectedFields: ["itemName", "internalName", "sku", "weight"] }, buildThermalQrValue(item.sku, ORIGIN));
  const bigFontAuto = analyzeThermalLabel(item, { ...BASE_CONFIG, fontSize: 10, selectedFields: ["itemName", "internalName", "sku", "weight"] }, buildThermalQrValue(item.sku, ORIGIN), { autoFit: true });
  assert(bigFontAuto.fits, "Auto-fit must shrink the font so all fields still print");
  assert(bigFontAuto.appliedFontSize < bigFont.appliedFontSize, "Auto-fit must use a smaller font than configured");
  assert(bigFontAuto.adjustments.length > 0, "Auto-fit must record the adjustments it applied");

  // QR auto-fit: oversized QR shrinks exactly to the smallest scannable size, never below it.
  const hugeQrAuto = analyzeThermalLabel(item, { ...BASE_CONFIG, qrSize: 20, selectedFields: ["sku", "price", "qrCode"] }, buildThermalQrValue(item.sku, ORIGIN), { autoFit: true });
  assert(hugeQrAuto.fits, "Oversized QR must be auto-shrunk to fit");
  assert(hugeQrAuto.appliedQrSize >= hugeQrAuto.minimumQrSize - 0.01, "Auto-fitted QR must never go below its minimum scannable size at 203 dpi");
  assert(hugeQrAuto.elements.filter(el => el.kind === "qr").every(el => el.width >= hugeQrAuto.minimumQrSize - 0.01), "Rendered QR elements must stay at or above the minimum scannable size");

  // Without auto-fit the oversized QR must be flagged instead of silently shrunk.
  const manual = analyzeThermalLabel(item, { ...BASE_CONFIG, qrSize: 20, selectedFields: ["sku", "price", "qrCode"] }, buildThermalQrValue(item.sku, ORIGIN));
  assert(!manual.fits || manual.appliedQrSize === 20, "Without auto-fit the configured QR size must be kept as configured");

  const after = suggestThermalFieldRemovals([item], { ...BASE_CONFIG, selectedFields: essentials }, ORIGIN);
  assert(after.length === 0, "No removals suggested when essentials already fit");

  const qrValue = buildThermalQrValue("KG-12", ORIGIN);
  assert(qrValue === `${ORIGIN}/preview/KG-12?source=qr`, "Product QR must point at the public preview page");

  const screenshotItem = { ...item, sku: "KGLGEMDGRN60000297", itemName: "Zambian Emerald Lab Grown", weightValue: 6, dimensions: "11 x 5.5 x 9" };
  const withBarcode = analyzeThermalLabel(screenshotItem, { ...BASE_CONFIG, selectedFields: ["sku", "weight", "shape", "gemType", "itemName", "dimensions", "qrCode", "barcode"] }, buildThermalQrValue(screenshotItem.sku, ORIGIN), { autoFit: true });
  assert(withBarcode.fits, "Screenshot SKU, QR, barcode and six text fields must fit after text auto-fit");
  const barcode = withBarcode.elements.find(element => element.kind === "barcode");
  assert(barcode && barcode.x >= 1.5 && barcode.x + barcode.width <= 48.5 && barcode.y + barcode.height <= 23.5, "Barcode and quiet zones must stay inside all safe edges");
  assert(withBarcode.appliedQrSize >= 12, "QR must stay at least 12 mm");
  const named = analyzeThermalLabel(item, { ...BASE_CONFIG, selectedFields: ["sku", "internalName"] }, qrValue);
  assert(named.elements.some(element => element.kind === "text" && element.field === "internalName" && element.text.includes("Internal")), "Selected saved internal name must be rendered");
  const unnamed = analyzeThermalLabel({ ...item, internalName: "" }, { ...BASE_CONFIG, selectedFields: ["sku", "internalName"] }, qrValue);
  assert(unnamed.issues.some(issue => issue.field === "internalName" && issue.severity === "warning"), "Missing internal name must be explained instead of silently disappearing");
  assert(toLabelItem(item, { sellingPrice: 10, internalName: null }).internalName === item.internalName, "Legacy job without an internal name must use the inventory's saved name");

  const actualScreenshot = { ...screenshotItem, internalName: "", gemType: "Emerald", color: "Green", weightRatti: 6.54,
    dimensions: "11 x 5.3 x 9.5", sellingPrice: 3300, pricingMode: "PER_CARAT", sellingRatePerCarat: 550 };
  const maximumScreenshotFields = ["itemName", "sku", "weight", "gemType", "color", "shape", "dimensions", "price", "qrCode", "barcode", "companyLogo"];
  const maximum = analyzeThermalLabel(actualScreenshot, { ...BASE_CONFIG, includeChecksumInR: false, selectedFields: maximumScreenshotFields }, buildThermalQrValue(actualScreenshot.sku, ORIGIN), { autoFit: true });
  assert(maximum.fits && maximum.appliedFontSize < BASE_CONFIG.fontSize, "Maximum screenshot fields must fit by reducing all text sizes and compacting short details");
  assert(maximum.compactDetails && maximum.overflowElements.length === 0, "Maximum screenshot content must be retained in compact rows");
  assert(maximum.elements.some(element => element.kind === "text" && element.fields?.includes("color") && element.text.includes("Green")), "Compaction must preserve selected colour text");
  assertCollisionFree(maximum);
  const less = maximumScreenshotFields.filter(field => !["gemType", "color"].includes(field));
  const reduced = analyzeThermalLabel(actualScreenshot, { ...BASE_CONFIG, includeChecksumInR: false, selectedFields: less }, buildThermalQrValue(actualScreenshot.sku, ORIGIN), { autoFit: true });
  assert(reduced.fits, "Reduced screenshot selection with dimensions, price, barcode and logo must fit");
  assertCollisionFree(reduced);
  const impossible = analyzeThermalLabel(item, { ...BASE_CONFIG, selectedFields: [...allFields, "companyLogo", "companyName", "barcode"] }, buildThermalQrValue(item.sku, ORIGIN), { autoFit: true });
  assert(!impossible.fits && impossible.appliedFontSize === 6 && impossible.overflowElements.length > 0, "An impossible selection must reach 6 pt and report its undrawn overflow instead of hiding or overlapping it");
  assertCollisionFree(impossible);
  // Cover the interaction of QR/quiet zones, footer codes/logo and variable text selections.
  const variableFields = ["weight", "gemType", "color", "shape", "dimensions", "price", "companyLogo", "barcode"];
  for (let mask = 0; mask < 256; mask++) {
    const fields = ["itemName", "sku", "qrCode", ...variableFields.filter((_, bit) => mask & (1 << bit))];
    const layout = analyzeThermalLabel(actualScreenshot, { ...BASE_CONFIG, includeChecksumInR: false, selectedFields: fields }, buildThermalQrValue(actualScreenshot.sku, ORIGIN), { autoFit: true });
    assertCollisionFree(layout);
    assert(layout.appliedFontSize >= 6 && layout.appliedQrSize >= 12, "Fitting must retain readable text and a protected QR");
    if (layout.fits) assert(layout.overflowElements.length === 0, "A printable label cannot have undrawn content");
  }
}

run();
console.log("thermal-label-layout.unit.ts passed");
