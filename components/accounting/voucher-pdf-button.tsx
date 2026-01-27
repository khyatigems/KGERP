"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { generateVoucherPDF } from "@/lib/voucher-pdf";
import { getCompanyDetailsForVoucher } from "@/app/(dashboard)/accounting/actions";
import { toast } from "sonner";

interface VoucherData {
  voucherNumber: string;
  voucherDate: Date;
  voucherType: string;
  amount: number;
  narration: string | null;
  expense?: {
    category?: { name: string };
    vendorName?: string | null;
    paymentMode?: string | null;
  } | null;
  createdBy?: { name: string } | null;
}

export function VoucherPDFButton({ voucher }: { voucher: VoucherData }) {
    const handleDownload = async () => {
        try {
            const company = await getCompanyDetailsForVoucher();
            
            const pdfBlob = await generateVoucherPDF({
              voucherNumber: voucher.voucherNumber,
              date: voucher.voucherDate,
              type: voucher.voucherType,
              amount: voucher.amount,
              narration: voucher.narration,
              category: voucher.expense?.category?.name || "General",
              vendorName: voucher.expense?.vendorName,
              paymentMode: voucher.expense?.paymentMode || "CASH",
              createdBy: voucher.createdBy?.name || "Admin", 
              companyName: company.name,
              companyAddress: company.address,
              companyPhone: company.phone || undefined,
              companyEmail: company.email || undefined,
              logoUrl: company.logoUrl || undefined
            });
            
            if (!(pdfBlob instanceof Blob)) {
                throw new Error("PDF generation failed");
            }

            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Voucher-${voucher.voucherNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Cleanup
            setTimeout(() => URL.revokeObjectURL(url), 100);
        } catch (e) {
            console.error(e);
            toast.error("Failed to generate PDF");
        }
    };

    return (
        <Button onClick={handleDownload}>
            <Printer className="mr-2 h-4 w-4" /> Print Voucher
        </Button>
    );
}
