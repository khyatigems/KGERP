"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, MoreHorizontal, ExternalLink } from "lucide-react";
import { deleteSale } from "@/app/(dashboard)/sales/actions";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SalesActionsProps {
  saleId: string;
  invoiceToken?: string | null;
  canDelete: boolean;
}

export function SalesActions({ saleId, invoiceToken, canDelete }: SalesActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {invoiceToken && (
            <DropdownMenuItem asChild>
                <Link href={`/invoice/${invoiceToken}`} target="_blank">
                    <ExternalLink className="mr-2 h-4 w-4" /> View Invoice
                </Link>
            </DropdownMenuItem>
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
