"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Skeleton } from "@/components/ui/skeleton";

export function PreviewQR({ url }: { url: string }) {
    const [qrData, setQrData] = useState<string>("");

    useEffect(() => {
        // If url is provided, use it. Otherwise use current window location.
        const targetUrl = url || window.location.href;
        
        QRCode.toDataURL(targetUrl, { width: 150, margin: 1 })
            .then(setQrData)
            .catch(console.error);
    }, [url]);

    if (!qrData) return <Skeleton className="w-[150px] h-[150px]" />;

    return (
        <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrData} alt="QR Code" className="w-[150px] h-[150px]" />
            <p className="text-xs text-muted-foreground">Scan to view details</p>
        </div>
    );
}
