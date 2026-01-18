"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Eye, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InventoryQrDialog } from "./inventory-qr";

interface InventoryActionsProps {
  item: {
    id: string;
    itemName: string;
    sku: string;
    status: string;
  };
}

export function InventoryActions({ item }: InventoryActionsProps) {
  return (
    <div className="flex items-center justify-end gap-1">
      <InventoryQrDialog itemId={item.id} itemName={item.itemName} sku={item.sku} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
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
                  <DollarSign className="mr-2 h-4 w-4" /> Mark as Sold
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/quotes/new?inventoryId=${item.id}`}>
                  <FileText className="mr-2 h-4 w-4" /> Create Quotation
                </Link>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
