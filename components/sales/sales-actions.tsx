"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreHorizontal, ExternalLink, FileText, Printer } from "lucide-react";
import { deleteSale, getInvoiceDataForThermal } from "@/app/(dashboard)/sales/actions";
import { generateThermalInvoicePDF } from "@/lib/thermal-invoice-generator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface SalesActionsProps {
  saleId: string;
  invoiceToken?: string | null;
  canDelete: boolean;
}

export function SalesActions({ saleId, invoiceToken, canDelete }: SalesActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    setDeleteOpen(true);
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
    <>
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sale</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this sale? This will revert the inventory item to IN_STOCK and may delete the linked invoice if no other items remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setIsDeleting(true);
                try {
                  const res = await deleteSale(saleId);
                  if (res && (res as unknown as { message?: string }).message) {
                    toast.error((res as { message: string }).message);
                  } else {
                    toast.success("Sale deleted successfully");
                    router.refresh();
                  }
                } catch (e) {
                  console.error(e);
                  toast.error("Failed to delete sale");
                } finally {
                  setIsDeleting(false);
                  setDeleteOpen(false);
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
