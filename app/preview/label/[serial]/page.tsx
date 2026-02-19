import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { computeWeightGrams } from "@/lib/utils";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { createCanvas } from "canvas";
import { getPackagingSettings } from "@/app/erp/packaging/actions";

interface PreviewLabelPageProps {
  params: Promise<{ serial: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Label Preview - ${serial}`,
  };
}

// Helper to generate QR Data URL
async function makeQrPng(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 0, errorCorrectionLevel: "M", width: 200 });
}

// Helper to generate Barcode Data URL
function makeBarcodePng(text: string): string {
  const canvas = createCanvas(300, 100);
  JsBarcode(canvas, text, {
    format: "CODE128",
    width: 2,
    height: 40,
    displayValue: false,
    margin: 0,
  });
  return canvas.toDataURL();
}

function formatMfgDate(date: Date | null) {
  if (!date) return "-";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatPackingMonthYear(date: Date | null) {
    if (!date) return "-";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString("en-IN", { month: "short", year: "numeric" });
}

export default async function PreviewLabelPage({ params }: PreviewLabelPageProps) {
  const { serial } = await params;

  // 1. Fetch Serial Data
  // We need to use prisma directly here as this is a server component
  // Use unknown first, then cast to expected shape to avoid 'any' error
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialRecord = await (prisma as unknown as { gpisSerial: { findUnique: (args: { where: { serialNumber: string } }) => Promise<any> } }).gpisSerial.findUnique({
    where: { serialNumber: serial },
  });

  if (!serialRecord) {
    notFound();
  }

  // 2. Fetch Inventory Data
  const inv = await prisma.inventory.findUnique({
    where: { sku: serialRecord.sku },
  });

  if (!inv) {
    notFound();
  }

  // 3. Fetch Settings
  const settingsRes = await getPackagingSettings();
  const s = (settingsRes.data || {}) as Record<string, unknown>;

  // 4. Prepare Label Data
  const showRegisteredAddress = (s.showRegisteredAddress as boolean | undefined) ?? true;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showGstin = (s.showGstin as boolean | undefined) ?? true;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const showIec = (s.showIec as boolean | undefined) ?? true;
  const showSupport = (s.showSupport as boolean | undefined) ?? true;
  
  // Parse HSN
  const categoryHsnMap = s.categoryHsnJson ? JSON.parse(s.categoryHsnJson as string) : {};
  const mappedHsn = inv.category ? categoryHsnMap[inv.category] : undefined;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hsn = mappedHsn || inv.hsnCode || "7103";

  // Format Data
  const gemstoneName = inv.itemName || "Gemstone";
  const stoneType = inv.stoneType || inv.gemType || "Natural";
  const originCountry = inv.originCountry || inv.origin || "-";
  const weightCarat = inv.weightValue?.toFixed(2) ?? "0.00";
  const weightRatti = inv.weightRatti?.toFixed(2) ?? "-";
  const weightGrams = computeWeightGrams(inv).toFixed(2);
  const toleranceCarat = (s.toleranceCarat as number) ?? 0.01;
  const toleranceGram = (s.toleranceGram as number) ?? 0.01;
  const color = inv.color || "-";
  const clarity = inv.clarityGrade || inv.clarity || "-";
  const cut = inv.cutGrade || inv.cut || "-";
  const treatment = inv.treatment || "None";
  const sku = inv.sku;
  const serialNumber = serialRecord.serialNumber;
  const qty = serialRecord.unitQuantity ?? 1;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const mfgDate = formatMfgDate(serialRecord.packingDate || serialRecord.createdAt);
  const packingMonthYear = formatPackingMonthYear(serialRecord.packingDate || serialRecord.createdAt);
  const mrp = inv.sellingPrice ? `₹ ${inv.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-";
  
  // Export Logic
  // For now, assuming RETAIL if not explicitly EXPORT, or check some flag.
  // The prompt implies we might have both. Let's default to Retail layout structure 
  // but if needed we can detect variant. 
  // Let's assume Retail for now based on typical preview usage, 
  // or checks user settings? 
  // Actually, let's just render a standard "Retail" view as default, 
  // effectively matching the physical label design.
  
  const madeIn = serialRecord.madeIn || "India";
  const exportCountry = madeIn.replace(/^Made in\s*/i, "").trim() || "India";
  
  // QR & Barcode
  const qrPayload = `SKU:${sku}|Serial:${serialNumber}|QC:${serialRecord.qcCode || "PASS"}`;
  const qrDataUrl = await makeQrPng(qrPayload);
  const barcodeDataUrl = makeBarcodePng(serialNumber);

  const logoUrl = (s.logoUrl as string) || null;
  const estYear = (s.estYear as string) || "2023";

  // Prepare Support Info
  const supportEmail = s.supportEmail as string;
  const supportPhone = s.supportPhone as string;
  const website = s.website as string;
  const supportParts = [supportEmail, supportPhone, website].filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Packaging Label Preview</h1>
        <div className="text-sm text-gray-500">Serial: {serial}</div>
      </div>

      <Card className="p-8 bg-white shadow-lg w-full max-w-[500px] mx-auto overflow-hidden">
        {/* LABEL CONTAINER - Matches Aspect Ratio / CSS of Puppeteer */}
        <div 
          className="relative bg-white border border-gray-300 mx-auto select-none"
          style={{
            width: "378px",
            height: "189px",
            fontFamily: "Arial, sans-serif",
            fontSize: "10px",
            overflow: "hidden"
          }}
        >
          {/* HEADER */}
          <div className="h-[45px] relative">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={logoUrl} 
                alt="Logo" 
                className="absolute top-[12px] left-[12px] w-[30px] h-[20px] object-contain z-10" 
              />
            )}
            <div className="absolute top-[12px] right-[12px] font-sans text-[8px] text-[#222] z-10">
              Since {estYear}
            </div>
            {/* Brand Name & Tagline Removed as per request */}
          </div>

          {/* BODY */}
          <div className="flex h-[144px]">
            {/* LEFT COLUMN */}
            <div className="flex-1 px-[12px] pt-[6px] pb-[40px] text-[7.8pt] overflow-hidden">
              <div className="mb-[2px]">
                <div className="font-semibold text-[10px] mb-[3px] leading-tight max-h-[2.3em] overflow-hidden whitespace-normal">
                   {stoneType} {originCountry !== "-" ? originCountry : ""} {gemstoneName}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                  <strong>Stone Type:</strong> {stoneType}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                  <strong>Weight:</strong> {weightCarat} CT ±{toleranceCarat} | <strong>Ratti:</strong> {weightRatti}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                  <strong>Net Weight:</strong> {weightGrams} g ±{toleranceGram}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                  <strong>Color:</strong> {color} | <strong>Clarity:</strong> {clarity} | <strong>Cut:</strong> {cut}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                  <strong>Origin:</strong> {originCountry} | <strong>Treatment:</strong> {treatment}
                </div>
                <div className="mt-[2px] text-[7.5pt]">
                  SKU: {sku}
                </div>
                <div className="mt-[2px] text-[7.5pt]">
                   Serial No: {serialNumber}
                </div>
              </div>

              {/* COMPLIANCE / RETAIL DETAILS */}
              <div className="mt-[6px]">
                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2]">
                   <strong>Qty:</strong> {qty} | <strong>Packed:</strong> {packingMonthYear}
                </div>
                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] mt-[6px]">
                   <strong>MRP (Incl. of All Taxes):</strong> <span className="font-bold tabular-nums tracking-normal">{mrp}</span>
                </div>
                
                {/* SEAL WARNING */}
                <div className="font-semibold text-center text-[7.2pt] my-[6px]">
                  *** DO NOT ACCEPT IF SEAL IS BROKEN ***
                </div>

                 {/* ADDRESS */}
                 <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] mt-[6px]">
                   <strong>Mfd & Packed by:</strong> Khyati Precious Gems Pvt. Ltd.
                 </div>
                 {(s.registeredAddress as string) && showRegisteredAddress && (
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] mt-[6px]">
                       {String(s.registeredAddress)}
                    </div>
                 )}
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] mt-[6px]">
                    Made in {exportCountry}
                  </div>
                  {supportParts.length > 0 && showSupport && (
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[6.4pt] leading-[1.2] mt-[6px]">
                       Support: {supportParts.join(" | ")}
                    </div>
                  )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="w-[95px] relative text-center pt-[8px] px-[12px] box-border">
               <div className="w-[68px] h-[68px] mx-auto mb-[4px]">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={qrDataUrl} alt="QR" className="w-full h-full object-contain" />
               </div>
               <div className="text-center text-[6.5pt] leading-[1.1] mb-[6px] text-[#222]">
                 Scan to verify authenticity
               </div>
               
               {/* BARCODE ZONE */}
               <div className="absolute bottom-[24px] left-[19px] right-[19px] h-[30px]">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                 <img src={barcodeDataUrl} alt="Barcode" className="w-full h-full object-contain" />
               </div>
               <div className="absolute bottom-[19px] left-[19px] right-[19px] text-center text-[7px] font-mono z-10">
                 {serialNumber}
               </div>
            </div>
          </div>

          {/* FOOTER STRIP */}
          <div className="absolute bottom-0 h-[18px] w-full bg-[#f2f2f2] flex items-center justify-center">
             <div className="text-[7px] text-[#777]">
               {String(s.microBorderText || "KHYATI GEMS AUTHENTIC PRODUCT")}
             </div>
          </div>
        </div>
      </Card>
      
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>This page is publicly accessible.</p>
        <p>Scan the QR code on the physical label to visit the verification page.</p>
      </div>
    </div>
  );
}
