"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import type { PackagingLabelData } from "@/lib/packaging-pdf-generator";

interface PackagingLabelProps {
  data: PackagingLabelData;
}

export function PackagingLabel({ data }: PackagingLabelProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    // Generate QR
    // The QR code typically contains the verification URL
    const url = `https://erp.khyatigems.com/preview/${data.serial}`;
    QRCode.toDataURL(url, { width: 150, margin: 0 }, (err, url) => {
      if (!err) setQrUrl(url);
    });

    // Generate Barcode
    if (barcodeRef.current) {
      JsBarcode(barcodeRef.current, data.serial, {
        format: "CODE128",
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 12,
        margin: 0,
      });
    }
  }, [data.serial]);

  // Format dates
  const packingDate = data.packingDate ? new Date(data.packingDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) : "-";

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Label Container - 4x6 inch equivalent for display, responsive */}
      <div 
        className="bg-white text-black border shadow-lg print:shadow-none print:border-none relative overflow-hidden flex flex-col"
        style={{
          width: "100%",
          maxWidth: "4in", // Default to 4 inch width
          aspectRatio: "2/3", // 4x6 aspect ratio
          padding: "0.2in",
        }}
      >
        {/* Header / Brand */}
        <div className="text-center border-b pb-2 mb-2">
          {data.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.logoUrl} alt="Logo" className="h-12 mx-auto mb-1 object-contain" />
          )}
          <h1 className="font-bold text-lg uppercase tracking-wide">{data.brandName || "KHYATI GEMS"}</h1>
          {data.tagline && <p className="text-xs text-gray-600">{data.tagline}</p>}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-2 text-sm">
          
          {/* Item Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="font-semibold text-gray-500 text-xs uppercase">Item</div>
            <div className="font-bold truncate">{data.gemstoneName}</div>

            <div className="font-semibold text-gray-500 text-xs uppercase">SKU</div>
            <div className="font-mono">{data.sku}</div>

            <div className="font-semibold text-gray-500 text-xs uppercase">Weight</div>
            <div>
              <span className="font-bold">{data.weightCarat} ct</span>
              <span className="text-gray-500 ml-1">({data.weightGrams?.toFixed(2)} g)</span>
            </div>

            <div className="font-semibold text-gray-500 text-xs uppercase">Shape/Cut</div>
            <div>{[data.stoneType, data.cut].filter(Boolean).join(" / ")}</div>

            {data.color && (
              <>
                <div className="font-semibold text-gray-500 text-xs uppercase">Color</div>
                <div>{data.color}</div>
              </>
            )}
            
            {data.clarity && (
              <>
                <div className="font-semibold text-gray-500 text-xs uppercase">Clarity</div>
                <div>{data.clarity}</div>
              </>
            )}

            {data.originCountry && (
              <>
                <div className="font-semibold text-gray-500 text-xs uppercase">Origin</div>
                <div>{data.originCountry}</div>
              </>
            )}

            {data.certificateNumber && (
              <>
                <div className="font-semibold text-gray-500 text-xs uppercase">Cert No</div>
                <div className="font-mono">{data.certificateNumber}</div>
              </>
            )}
          </div>

          {/* QR and Barcode Section */}
          <div className="mt-auto pt-4 flex flex-col items-center gap-2">
            <div className="flex items-center justify-between w-full gap-4">
              {/* QR Code */}
              <div className="border p-1 rounded bg-white">
                 {/* eslint-disable-next-line @next/next/no-img-element */}
                {qrUrl && <img src={qrUrl} alt="QR" className="w-20 h-20 object-contain" />}
              </div>
              
              {/* Price and Metadata */}
              <div className="flex-1 text-right space-y-1">
                <div className="text-xs text-gray-500">MRP (Incl. of all taxes)</div>
                <div className="text-xl font-bold">₹ {data.mrp?.toLocaleString('en-IN')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Packed: {packingDate}
                </div>
                {data.madeIn && <div className="text-[10px] uppercase text-gray-400">{data.madeIn}</div>}
              </div>
            </div>

            {/* Barcode */}
            <div className="w-full flex justify-center mt-2">
              <svg ref={barcodeRef} className="w-full max-w-full"></svg>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-2 pt-2 border-t text-[10px] text-center text-gray-500 leading-tight">
          {data.supportWebsite && <div>{data.supportWebsite}</div>}
          {data.supportEmail && <div>{data.supportEmail}</div>}
          {data.legalMetrology && <div className="mt-1">{data.legalMetrology}</div>}
        </div>
      </div>
    </div>
  );
}
