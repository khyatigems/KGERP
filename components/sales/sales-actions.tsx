"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreHorizontal, ExternalLink, FileText, Printer } from "lucide-react";
import { deleteSale, getInvoiceDataForThermal } from "@/app/(dashboard)/sales/actions";
import { generateThermalInvoicePDF } from "@/lib/thermal-invoice-generator";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface SalesActionsProps {
  saleId: string;
  invoiceToken?: string | null;
  canDelete: boolean;
}

export function SalesActions({ saleId, invoiceToken, canDelete }: SalesActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm("Are you sure you want to delete this sale? This will revert the inventory item to IN_STOCK.")) return;
    setIsDeleting(true);
    try {
        await deleteSale(saleId);
    } catch (e) {
        console.error(e);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleThermalPrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
        const data = await getInvoiceDataForThermal(saleId);
        if (!data) {
            toast.error("Error", {
                description: "Failed to load invoice data. Ensure invoice is generated."
            });
            return;
        }
        await generateThermalInvoicePDF(data);
    } catch (error) {
        console.error(error);
        toast.error("Error", {
            description: "Failed to generate thermal invoice."
        });
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {isDeleting || isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
            <Link href={`/sales/${saleId}/create-invoice`}>
                <FileText className="mr-2 h-4 w-4" /> {invoiceToken ? "Configure Invoice" : "Create Invoice"}
            </Link>
        </DropdownMenuItem>
        {invoiceToken && (
            <>
                <DropdownMenuItem asChild>
                    <Link href={`/invoice/${invoiceToken}`} target="_blank">
                        <ExternalLink className="mr-2 h-4 w-4" /> View Invoice
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleThermalPrint}>
                    <Printer className="mr-2 h-4 w-4" /> Print Thermal Invoice
                </DropdownMenuItem>
            </>
        )}
        {canDelete && (
            <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete Sale
            </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
