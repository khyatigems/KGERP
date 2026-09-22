"use client";

import { ExportButton } from "@/components/ui/lottie";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoice-generator";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export function DownloadPdfButton({ data }: { data: InvoiceData }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const blob = await generateInvoicePDF(data);
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${data.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      console.error(e);
      toast({ title: "Failed to generate PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportButton
      size="sm"
      loading={loading}
      onClick={handleDownload}
      className="gap-2 print:hidden"
    >
      Download PDF
    </ExportButton>
  );
}
