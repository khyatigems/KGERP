import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { analyzePackagingThermal, analyzePackagingThermalBatch, packagingThermalBlocks, packagingThermalVerifyUrl, generatePackagingThermalPdfBlob } from "../../lib/packaging-thermal-layout";
import { generatePackagingPdfBlob, type PackagingLabelData } from "../../lib/packaging-pdf-generator";

export const packagingFixture: PackagingLabelData = {
  serial: "KG-GM-2610-000001-A7F2", sku: "KGLGEMDGRN60000297", gemstoneName: "Zambian Emerald Lab Grown",
  stoneType: "Emerald", condition: "New", category: "Loose Gemstone", weightCarat: 6, weightRatti: 6.54, weightGrams: 1.2,
  color: "Green", shape: "Oval", cutGrade: "Faceted", originCountry: "Zambia", treatment: "None", mrp: 3300,
  hsn: "7103", gstin: "08ABCDE1234F1Z5", packingDate: new Date("2026-10-19T12:00:00Z"), brandName: "KhyatiGems", estYear: "1990",
  registeredAddress: "Sample registered address, Jaipur, Rajasthan 302001", supportEmail: "support@khyatigems.com", supportPhone: "+91 9000000000",
  supportWebsite: "www.khyatigems.com", labelVariant: "RETAIL", labelVersion: "v1.0", inventoryLocation: "Safe A", qcCode: "QC-PASS", printJobId: "PJ-261019-1234",
};
const origin = "https://erp.khyatigems.com";
const stickerLayout = { pageWidthMm: 210, pageHeightMm: 297, rows: 5, cols: 2, labelWidthMm: 100, labelHeightMm: 50, marginLeftMm: 4, marginTopMm: 24, gapXmm: 2, gapYmm: 0, offsetXmm: 0, offsetYmm: 0, startPosition: 1 };

function allFontSizes(layout: ReturnType<typeof analyzePackagingThermal>) { return [layout].flatMap(page => page.elements.flatMap(element => element.kind === "text" ? [element.fontSize] : [])); }

async function run() {
  for (const variant of ["RETAIL", "EXPORT"] as const) {
    const fixture = { ...packagingFixture, labelVariant: variant, iec: variant === "EXPORT" ? "TEST123456" : undefined };
    const layout = analyzePackagingThermal(fixture, origin);
    assert(layout.fits, `Readable ${variant} single packaging label must fit`);
    assert(layout.fontSize >= 6 && layout.fontSize <= 7);
    assert.equal(layout.overflow.length, 0);
    assert.equal(layout.blocks.some(block => block.field === "price"), variant === "RETAIL", "Only Retail prints domestic MRP");
    assert.equal(layout.blocks.some(block => block.field === "origin"), variant === "EXPORT", "International prioritizes saved gemstone origin");
    assert(layout.blocks.some(block => block.field === "reference" && block.text.includes(fixture.serial)), "Human-readable serial must match the verification QR");
    assert(allFontSizes(layout).every(size => size >= 6));
    assert(!layout.elements.some(element => element.kind === "barcode"), "Duplicate barcode must not consume readable text area");
    const pages = [layout];
    const allElements = pages.flatMap(page => page.elements);
    const text = allElements.flatMap(element => element.kind === "text" && element.field !== "qrCaption" ? [element.text] : []).join("").replace(/\s/g, "");
    for (const block of packagingThermalBlocks(fixture)) assert(text.includes(block.text.replace(/\s/g, "")), `${block.field} must print in full without ellipses`);
    for (const page of pages) for (const [index, element] of page.elements.entries()) {
      assert(element.x >= .999 && element.y >= .999 && element.x + element.width <= 49.001 && element.y + element.height <= 24.001, `${element.field} must remain within the 50 x 25 safe area`);
      for (const other of page.elements.slice(index + 1)) {
        const horizontal = Math.min(element.x + element.width, other.x + other.width) - Math.max(element.x, other.x);
        const vertical = Math.min(element.y + element.height, other.y + other.height) - Math.max(element.y, other.y);
        assert(horizontal <= .001 || vertical <= .001, `${element.field} must not overlap ${other.field}`);
      }
      if (element.kind === "qr") {
        assert.equal(element.value, `HTTPS://ERP.KHYATIGEMS.COM/V/${fixture.serial}`);
        assert(element.width / (element.modules + 8) >= 4 * 25.4 / 203 - .00001, "QR must retain four dots per module plus its four-module quiet zone");
      }
    }
    const blob = await generatePackagingPdfBlob([fixture, { ...fixture, serial: "KG-GM-2610-000002-B8D3" }], stickerLayout, { medium: "THERMAL_50X25", thermalOrigin: origin, selectedFields: [], itemsPerLabel: 3 });
    assert((await blob.text()).startsWith("%PDF-"));
    if (process.argv.includes("--render-fixtures")) { await mkdir("tmp/pdfs", { recursive: true }); await writeFile(`tmp/pdfs/packaging-thermal-${variant.toLowerCase()}.pdf`, Buffer.from(await blob.arrayBuffer())); }
  }
  const withCare = { ...packagingFixture, careInstruction: "Handle with care, Avoid chemicals & impact", certificateLab: "Example lab", certificateNumber: "REPORT-123", tagline: "Optional promotional tagline", printJobId: "PJ-261019-9999" };
  assert(analyzePackagingThermal(withCare, origin).fits, "Saved care instructions must remain readable");
  assert(!packagingThermalBlocks(withCare).some(block => block.text.includes("REPORT-123") || block.text.includes("PJ-261019-9999") || block.text.includes("promotional tagline")), "Optional report references, job metadata and marketing must not crowd the thermal label");
  assert(analyzePackagingThermal({ ...packagingFixture, registeredAddress: "" }, origin).fits, "Off-label address must not affect product identity printing");
  assert(!analyzePackagingThermal({ ...packagingFixture, mrp: Number.NaN }, origin).fits, "Retail MRP must be valid");
  assert.equal(analyzePackagingThermalBatch([packagingFixture], origin).entries.length, 1, "Exactly one label per package");
  const impossible = { ...packagingFixture, gemstoneName: "Very long gemstone description ".repeat(100) };
  assert(!analyzePackagingThermal(impossible, origin).fits);
  assert(!analyzePackagingThermalBatch([packagingFixture, impossible], origin).fits);
  await assert.rejects(generatePackagingThermalPdfBlob([impossible], origin), /readable|too long/);
  assert.equal(new URL(packagingThermalVerifyUrl(packagingFixture.serial, origin)).pathname, `/V/${packagingFixture.serial}`, "Compact public alias preserves the complete serial");
  assert.equal(new URL(packagingThermalVerifyUrl(packagingFixture.serial, origin)).origin, origin, "QR optimization must not change the ERP host");
  const longHost = analyzePackagingThermal(packagingFixture, "https://a-very-long-production-hostname-for-this-erp.example.com");
  const longQr = longHost.elements.find(element => element.kind === "qr");
  if (longQr?.kind === "qr") assert(longQr.width / (longQr.modules + 8) >= 4 * 25.4 / 203 - .00001, "Long URLs must not shrink the QR below four dots");
  assert.throws(() => packagingThermalVerifyUrl("serial", "https://example.com/store"));
  assert(!analyzePackagingThermal({ ...packagingFixture, gemstoneName: "翡翠" }, origin).fits, "Unsupported text must block output rather than corrupt identity data");
  // Existing sticker test-sheet geometry and routing remain available without a thermal option.
  const sticker = await generatePackagingPdfBlob([], stickerLayout, { selectedFields: [], drawGuides: true });
  if (process.argv.includes("--render-fixtures")) await writeFile("tmp/pdfs/packaging-sticker-regression.pdf", Buffer.from(await sticker.arrayBuffer()));
  console.log("packaging-thermal.unit.ts passed");
}
if (!process.argv.includes("--fixture-import-only")) run().catch(error => { console.error(error); process.exitCode = 1; });
