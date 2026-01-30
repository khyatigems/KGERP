"use client";

import Link from "next/link";
import { Eye, MoreHorizontal, Pencil, IndianRupee, FileText, Globe, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryQrDialog } from "./inventory-qr";
import { ListingManager } from "./listing-manager";
import { LabelPrintDialog } from "./label-print-dialog";

interface InventoryActionsProps {
  item: {
    id: string;
    itemName: string;
    internalName?: string | null;
    sku: string;
    status: string;
    gemType?: string | null;
    colorCode?: { name: string } | null;
    weightValue?: number | null;
    weightUnit?: string | null;
    weightRatti?: number | null;
    pricingMode?: string;
    sellingRatePerCarat?: number | null;
    flatSellingPrice?: number | null;
    shape?: string | null;
    dimensionsMm?: string | null;
    stockLocation?: string | null;
  };
}

export function InventoryActions({ item }: InventoryActionsProps) {
  const sellingPrice = item.pricingMode === "PER_CARAT"
    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
    : item.flatSellingPrice || 0;

  return (
    <div className="flex items-center justify-end gap-1">
      <InventoryQrDialog itemId={item.id} itemName={item.itemName} sku={item.sku} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="transition-transform hover:scale-110">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <Link href={`/inventory/${item.id}`}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </Link>
          </DropdownMenuItem>
          {item.status === "IN_STOCK" && (
            <>
              <DropdownMenuItem asChild>
                <Link href={`/inventory/${item.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/sales/new?inventoryId=${item.id}`}>
                  <IndianRupee className="mr-2 h-4 w-4" /> Mark as Sold
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/new?inventoryId=${item.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> Create Quotation
                </Link>
              </DropdownMenuItem>
              <ListingManager 
                  inventoryId={item.id} 
                  sku={item.sku} 
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Globe className="mr-2 h-4 w-4" /> Manage Listings
                    </DropdownMenuItem>
                  } 
              />
              <LabelPrintDialog
                 item={{
                    id: item.id,
                    sku: item.sku,
                    itemName: item.itemName,
                    internalName: item.internalName || "",
                    gemType: item.gemType || "",
                    color: item.colorCode?.name || "",
                    weightValue: item.weightValue || 0,
                    weightUnit: item.weightUnit || "",
                    weightRatti: item.weightRatti,
                    shape: item.shape,
                    dimensions: item.dimensionsMm,
                    stockLocation: item.stockLocation,
                    sellingPrice: sellingPrice,
                    pricingMode: item.pricingMode,
                    sellingRatePerCarat: item.sellingRatePerCarat
                 }}
                 trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Printer className="mr-2 h-4 w-4" /> Print Label
                    </DropdownMenuItem>
                 }
              />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
