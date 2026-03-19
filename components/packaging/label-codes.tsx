"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";

type Props = {
  sku: string;
  barcodeText: string;
  verifyUrl: string;
};

export function PackagingLabelCodes({ sku, barcodeText, verifyUrl }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);

  const safeVerifyUrl = useMemo(() => verifyUrl.trim(), [verifyUrl]);
  const safeBarcodeText = useMemo(() => barcodeText.trim(), [barcodeText]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const qr = await QRCode.toDataURL(safeVerifyUrl, { margin: 0, errorCorrectionLevel: "M" });
        if (!cancelled) setQrDataUrl(qr);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, safeBarcodeText, {
          format: "CODE128",
          width: 2,
          height: 36,
          displayValue: false,
          margin: 0,
        });
        if (!cancelled) setBarcodeDataUrl(canvas.toDataURL("image/png"));
      } catch {
        if (!cancelled) setBarcodeDataUrl(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [safeBarcodeText, safeVerifyUrl]);

  return (
    <div className="w-full space-y-3">
      <div className="text-center w-full">
        <div className="text-[7px] text-gray-500 uppercase tracking-wider mb-0.5">SKU</div>
        <div className="font-mono font-bold text-[10px] break-all leading-tight bg-white border rounded px-1 py-0.5 shadow-sm">
          {sku}
        </div>
      </div>

      {barcodeDataUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={barcodeDataUrl} alt="Barcode" className="w-full h-[36px] object-contain bg-white border rounded" />
      )}

      {qrDataUrl && (
        <div className="flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code" className="h-[64px] w-[64px] object-contain bg-white border rounded" />
        </div>
      )}
    </div>
  );
}

