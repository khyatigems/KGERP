'use client';

import { Button } from "@/components/ui/button";
import { ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { GciCertModal } from "./gci-cert-modal";

interface GciCertButtonProps {
    inventoryId: string;
    certificateNo?: string | null;
    lab?: string | null;
    certificationUrl?: string | null;
}

export function GciCertButton({ inventoryId, certificateNo, lab, certificationUrl }: GciCertButtonProps) {
    // If it's already a GCI certificate, show status
    if (lab === 'GCI' && certificateNo) {
        return (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
                <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">GCI Certified</span>
                </div>
                <div className="text-xs text-blue-700 font-mono mb-2">{certificateNo}</div>
                {certificationUrl && (
                    <Button variant="outline" size="sm" className="w-full h-7 text-xs bg-white" asChild>
                        <Link href={certificationUrl} target="_blank">
                            View Certificate <ExternalLink className="ml-1 h-3 w-3" />
                        </Link>
                    </Button>
                )}
            </div>
        );
    }

    // If it has another lab certificate
    if (certificateNo) {
        return (
            <div className="mt-2 text-sm text-muted-foreground">
                Certified by {lab || "Unknown Lab"} ({certificateNo})
            </div>
        );
    }

    return (
        <div className="mt-2">
            <GciCertModal inventoryId={inventoryId} />
        </div>
    );
}
