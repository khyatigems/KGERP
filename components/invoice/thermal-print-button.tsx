"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { generateInvoiceLabelPDF, InvoiceLabelData } from "@/lib/invoice-label-generator";
import { toast } from "sonner";

interface ThermalPrintButtonProps {
    data: InvoiceLabelData;
}

export function ThermalPrintButton({ data }: ThermalPrintButtonProps) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handlePrint = async () => {
        setIsGenerating(true);
        try {
            const pdfUrl = await generateInvoiceLabelPDF(data);
            const win = window.open(pdfUrl, "_blank");
            if (!win) {
                toast.error("Please allow popups to print labels");
            }
        } catch (error) {
            console.error("Failed to generate thermal label", error);
            toast.error("Failed to generate thermal label");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 border-amber-200 hover:bg-amber-50 text-amber-700"
            title="Print 50x25mm Label"
        >
            {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <Printer className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Thermal Label</span>
        </Button>
    );
}
