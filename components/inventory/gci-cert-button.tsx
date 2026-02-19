'use client';

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { generateGciCertificate } from "@/app/actions/gci";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GciCertButtonProps {
    inventoryId: string;
    certificateNo?: string | null;
    lab?: string | null;
    certificationUrl?: string | null;
    meta?: {
        species?: string;
        variety?: string;
        color?: string;
        weight?: number;
        shape?: string;
        measurements?: string;
        origin?: string;
        treatment?: string;
        fluorescence?: string;
        certificateComments?: string;
        imageCount?: number;
    };
}

export function GciCertButton({ inventoryId, certificateNo, lab, certificationUrl, meta }: GciCertButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    
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
            <Button 
                onClick={() => {
                    startTransition(async () => {
                        if (meta) {
                            const missing: string[] = [];
                            if (!meta.species) missing.push("Species");
                            if (!meta.variety) missing.push("Variety");
                            if (!meta.color) missing.push("Color");
                            if (!meta.weight || meta.weight <= 0) missing.push("Weight");
                            if (!meta.shape) missing.push("Shape");
                            if (!meta.measurements) missing.push("Measurements");
                            if (!meta.origin) missing.push("Origin");
                            if (!meta.treatment) missing.push("Treatments");
                            if (!meta.fluorescence) missing.push("Fluorescence");
                            if (!meta.imageCount || meta.imageCount <= 0) missing.push("Images");
                            if (missing.length > 0) {
                                setMissingFields(missing);
                                setAlertMessage("Complete required fields before generating certificate.");
                                return;
                            }
                        }
                        const result = await generateGciCertificate(inventoryId);
                        if (result.success) {
                            toast.success(`Certificate ${result.certificateNumber} generated successfully!`);
                        } else {
                            setMissingFields([]);
                            setAlertMessage(result.error || "Failed to generate certificate");
                        }
                    });
                }} 
                disabled={isPending}
                size="sm"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                {isPending ? (
                    <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Generating...
                    </>
                ) : (
                    <>
                        <ShieldCheck className="mr-2 h-3 w-3" />
                        Generate GCI Cert
                    </>
                )}
            </Button>
            
            <AlertDialog open={!!alertMessage} onOpenChange={(open) => !open && setAlertMessage(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Action Required</AlertDialogTitle>
                        <AlertDialogDescription>
                            {alertMessage}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {missingFields.length > 0 && (
                        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md p-3 my-2">
                            {missingFields.join(", ")}
                        </div>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAlertMessage(null)}>
                            Close
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Link href={`/inventory/${inventoryId}/edit`}>
                                Edit Data
                            </Link>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
