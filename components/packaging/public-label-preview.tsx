"use client";

import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { PackagingLabelData } from "@/lib/packaging-pdf-generator";

interface PackagingLabelProps {
  data: PackagingLabelData;
}

export function PackagingLabel({ data }: PackagingLabelProps) {
  // Format dates
  const packingDate = data.packingDate ? new Date(data.packingDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) : "-";

  // Check if certificate is a URL
  const certIsUrl = data.certificateNumber?.startsWith("http");

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      {/* Label Container - 4x6 inch equivalent for display, responsive */}
      <div 
        className="bg-white text-black border shadow-lg print:shadow-none print:border-none relative overflow-hidden flex flex-col"
        style={{
          width: "100%",
          maxWidth: "4in", // Default to 4 inch width
          minHeight: "4in",
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
        <div className="flex-1 flex flex-col gap-4 text-sm">
          
          {/* Item Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <div>
               <div className="font-semibold text-gray-500 text-xs uppercase">Item</div>
               <div className="font-bold truncate">{data.gemstoneName}</div>
            </div>

            <div>
               <div className="font-semibold text-gray-500 text-xs uppercase">SKU</div>
               <div className="font-mono">{data.sku}</div>
            </div>

            <div>
               <div className="font-semibold text-gray-500 text-xs uppercase">Weight</div>
               <div>
                 <span className="font-bold">{data.weightCarat} ct</span>
                 <span className="text-gray-500 ml-1">({data.weightGrams?.toFixed(2)} g)</span>
               </div>
            </div>

            <div>
               <div className="font-semibold text-gray-500 text-xs uppercase">Shape</div>
               <div>{data.shape || "-"}</div>
            </div>

            <div>
               <div className="font-semibold text-gray-500 text-xs uppercase">Cut</div>
               <div>{data.cutGrade || data.cut || "-"}</div>
            </div>

            {data.color && (
              <div>
                <div className="font-semibold text-gray-500 text-xs uppercase">Color</div>
                <div>{data.color}</div>
              </div>
            )}
            
            {data.originCountry && (
              <div>
                <div className="font-semibold text-gray-500 text-xs uppercase">Origin</div>
                <div>{data.originCountry}</div>
              </div>
            )}

            {data.certificateNumber && (
              <div className="col-span-2 mt-2">
                <div className="font-semibold text-gray-500 text-xs uppercase mb-1">Certificate</div>
                {certIsUrl ? (
                  <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                    <a href={data.certificateNumber} target="_blank" rel="noopener noreferrer">
                      View Certificate <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <div className="font-mono bg-gray-50 p-2 rounded border text-center">
                    {data.certificateNumber}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-auto border-t pt-4">
              <div className="flex items-end justify-between">
                <div>
                   <div className="text-xs text-gray-500">Packed On</div>
                   <div className="font-medium">{packingDate}</div>
                </div>
                <div className="text-right">
                   <div className="text-xs text-gray-500">MRP (Incl. taxes)</div>
                   <div className="text-xl font-bold">₹ {data.mrp?.toLocaleString('en-IN')}</div>
                </div>
              </div>
              {data.madeIn && <div className="text-[10px] uppercase text-gray-400 mt-2 text-center">{data.madeIn}</div>}
          </div>

        </div>

        {/* Footer */}
        <div className="mt-4 pt-2 border-t text-[10px] text-center text-gray-500 leading-tight">
          {data.supportWebsite && <div>{data.supportWebsite}</div>}
          {data.supportEmail && <div>{data.supportEmail}</div>}
          {data.legalMetrology && <div className="mt-1">{data.legalMetrology}</div>}
        </div>
      </div>
    </div>
  );
}
