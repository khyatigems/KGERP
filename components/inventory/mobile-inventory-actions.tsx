"use client";

import Link from "next/link";
import { Pencil, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileInventoryActionsProps {
  id: string;
  status: string;
}

export function MobileInventoryActions({ id, status }: MobileInventoryActionsProps) {
  if (status !== "IN_STOCK") {
    return null; // Or show limited actions
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-background p-3 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] md:hidden">
      <Button variant="outline" size="sm" className="flex-1 mx-1" asChild>
        <Link href={`/inventory/${id}/edit`}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="flex-1 mx-1" asChild>
        <Link href={`/quotes/new?inventoryId=${id}`}>
          <FileText className="mr-2 h-4 w-4" /> Quote
        </Link>
      </Button>
      <Button size="sm" className="flex-1 mx-1" asChild>
        <Link href={`/sales/new?inventoryId=${id}`}>
          <DollarSign className="mr-2 h-4 w-4" /> Sold
        </Link>
      </Button>
    </div>
  );
}
