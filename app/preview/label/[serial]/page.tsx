import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Card } from "@/components/ui/card";
import { computeWeightGrams } from "@/lib/utils";
import { getPackagingSettings } from "@/app/erp/packaging/actions";
import { ExternalLink } from "lucide-react";

interface PreviewLabelPageProps {
  params: Promise<{ serial: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ serial: string }> }): Promise<Metadata> {
  const { serial } = await params;
  return {
    title: `Label Preview - ${serial}`,
  };
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
  try {
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
    
    // Parse HSN (if needed internally, though not displayed prominent)
    // const categoryHsnMap = s.categoryHsnJson ? JSON.parse(s.categoryHsnJson as string) : {};
    
    // Format Data
    const gemstoneName = inv.itemName || "Gemstone";
    const stoneType = inv.stoneType || inv.gemType || "Natural";
    const originCountry = inv.originCountry || inv.origin || "-";
    const weightCarat = inv.weightValue?.toFixed(2) ?? "0.00";
    const weightGrams = computeWeightGrams(inv).toFixed(2);
    const color = inv.color || "-";
    
    // Changes: Shape instead of Clarity
    const shape = inv.shape || "-";
    
    // Changes: Cut fetched correctly
    const cut = inv.cutGrade || inv.cut || "-";
    
    const treatment = inv.treatment || "None";
    const sku = inv.sku;
    const serialNumber = serialRecord.serialNumber;
    const qty = serialRecord.unitQuantity ?? 1;
    const packingMonthYear = formatPackingMonthYear(serialRecord.packingDate || serialRecord.createdAt);
    const mrp = inv.sellingPrice ? `₹ ${inv.sellingPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : "-";
    
    const madeIn = serialRecord.madeIn || "India";
    const exportCountry = madeIn.replace(/^Made in\s*/i, "").trim() || "India";
    
    // Certificate Logic
    const certNo = inv.certificateNo || inv.certificateNumber || null;
    
    // Detect if certNo is a URL
    const isCertUrl = certNo && (certNo.startsWith("http") || certNo.startsWith("www"));
    
    const logoUrl = (s.logoUrl as string) || null;
    const estYear = (s.estYear as string) || "2023";

    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-3xl mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Packaging Label Preview</h1>
          <div className="text-sm text-gray-500">Serial: {serial}</div>
        </div>

        <Card className="p-8 bg-white shadow-lg w-full max-w-[500px] mx-auto overflow-hidden">
          {/* LABEL CONTAINER */}
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
            <div className="h-[40px] relative border-b border-gray-100 mx-[12px] mb-[4px]">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={logoUrl} 
                  alt="Logo" 
                  className="absolute top-[4px] left-0 w-[80px] h-[32px] object-contain z-10" 
                />
              ) : (
                <div className="absolute top-[8px] left-0 font-bold text-lg text-[#222]">
                   KHYATIGEMS
                </div>
              )}
              <div className="absolute top-[12px] right-0 font-sans text-[8px] text-[#222] z-10">
                Since {estYear}
              </div>
            </div>

            {/* BODY */}
            <div className="flex h-[130px]">
              {/* LEFT COLUMN - Item Details */}
              <div className="flex-[1.4] px-[12px] pt-[2px] pb-[10px] text-[7.8pt] overflow-hidden flex flex-col justify-between">
                <div className="mb-[2px]">
                  <div className="font-semibold text-[10px] mb-[3px] leading-tight max-h-[2.3em] overflow-hidden whitespace-normal">
                     {stoneType} {originCountry !== "-" ? originCountry : ""} {gemstoneName}
                  </div>
                  
                  {/* Row 1 */}
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-1">
                    <strong>Shape:</strong> {shape} | <strong>Cut:</strong> {cut}
                  </div>

                  {/* Row 2 */}
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-1">
                    <strong>Color:</strong> {color} | <strong>Origin:</strong> {originCountry}
                  </div>
                  
                  {/* Row 3 - Weights */}
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-1">
                     <strong>Wt:</strong> {weightCarat} CT | {weightGrams} g
                  </div>

                  {/* Row 4 - Treatment/Cert */}
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis leading-tight mt-1 flex items-center gap-1">
                    <span><strong>Trt:</strong> {treatment}</span>
                    {certNo && (
                       <>
                         <span className="mx-1">|</span>
                         {isCertUrl ? (
                           <a 
                             href={certNo} 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="inline-flex items-center gap-0.5 text-blue-600 hover:underline font-semibold"
                           >
                             View Cert <ExternalLink className="h-2 w-2" />
                           </a>
                         ) : (
                           <span>
                             <strong>Cert:</strong> {certNo}
                           </span>
                         )}
                       </>
                    )}
                  </div>
                </div>

                {/* COMPLIANCE / RETAIL DETAILS */}
                <div className="mt-auto border-t border-dashed pt-1">
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] flex justify-between">
                     <span><strong>Qty:</strong> {qty}</span>
                     <span><strong>Packed:</strong> {packingMonthYear}</span>
                  </div>
                  <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[7.5pt] leading-[1.2] mt-[2px]">
                     <strong>MRP:</strong> <span className="font-bold tabular-nums tracking-normal">{mrp}</span> <span className="text-[6px] text-gray-500">(Incl. Taxes)</span>
                  </div>
                  
                   {/* ADDRESS */}
                   <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[6.5pt] leading-[1.1] mt-[3px] text-gray-600">
                     Mfd by: Khyati Precious Gems Pvt. Ltd.
                   </div>
                   {(s.registeredAddress as string) && showRegisteredAddress && (
                      <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[6.5pt] leading-[1.1] text-gray-500">
                         {String(s.registeredAddress)}
                      </div>
                   )}
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[6.5pt] leading-[1.1] text-gray-500">
                      Made in {exportCountry}
                    </div>
                </div>
              </div>

              {/* RIGHT COLUMN - SKU & Serial (Replaced QR) */}
              <div className="w-[110px] relative flex flex-col items-center justify-center border-l border-gray-100 bg-gray-50/50 px-2 py-2">
                 
                 <div className="text-center w-full">
                    <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-0.5">SKU</div>
                    <div className="font-mono font-bold text-[10px] break-all leading-tight bg-white border rounded px-1 py-0.5 shadow-sm">
                      {sku}
                    </div>
                 </div>

                 <div className="my-3 w-full border-t border-gray-200"></div>

                 <div className="text-center w-full">
                    <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-0.5">Serial No</div>
                    <div className="font-mono font-bold text-[11px] text-blue-700 tracking-wide break-all">
                      {serialNumber}
                    </div>
                 </div>

                 <div className="mt-4 text-[6px] text-center text-gray-400 leading-tight">
                   Scan physical label to verify
                 </div>
              </div>
            </div>

            {/* FOOTER STRIP */}
            <div className="absolute bottom-0 h-[15px] w-full bg-[#f8f8f8] flex items-center justify-center border-t border-gray-100">
               <div className="text-[7px] text-[#777] font-medium tracking-wide">
                 {String(s.microBorderText || "KHYATI GEMS AUTHENTIC PRODUCT")}
               </div>
            </div>
          </div>
        </Card>
        
        <div className="mt-8 text-center text-gray-500 text-sm max-w-md">
          <p>This is a digital preview.</p>
          <p className="mt-2 text-xs">The physical label includes a QR code and Barcode for automated verification and inventory tracking.</p>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Label Preview Error:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="p-6 max-w-md w-full bg-white text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Preview Error</h2>
          <p className="text-sm text-gray-600 mb-4">
            Could not generate label preview. Please verify the serial number and inventory data.
          </p>
          <div className="text-xs text-left bg-gray-100 p-3 rounded overflow-auto max-h-[100px]">
            {error instanceof Error ? error.message : String(error)}
          </div>
        </Card>
      </div>
    );
  }
}
