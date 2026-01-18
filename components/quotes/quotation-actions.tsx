"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, DollarSign, XCircle, Loader2 } from "lucide-react";
import { cancelQuotation } from "@/app/(dashboard)/quotes/actions";
import { useState } from "react";

interface QuotationActionsProps {
  id: string;
  status: string;
  items: { inventoryId: string }[];
}

export function QuotationActions({ id, status, items }: QuotationActionsProps) {
  const [isCancelling, setIsCancelling] = useState(false);

  if (status !== "ACTIVE") return null;

  const handleCancel = async () => {
      if (!confirm("Are you sure you want to cancel this quotation?")) return;
      setIsCancelling(true);
      try {
          await cancelQuotation(id);
      } catch (e) {
          console.error(e);
      } finally {
          setIsCancelling(false);
      }
  };

  const saleLink = items.length === 1 
      ? `/sales/new?quoteId=${id}&inventoryId=${items[0].inventoryId}`
      : `/sales/new?quoteId=${id}`;

  return (
    <div className="flex gap-2 ml-auto">
      <Button variant="outline" size="sm" onClick={handleCancel} disabled={isCancelling}>
        {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
        Cancel
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/quotes/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
        </Link>
      </Button>
      <Button size="sm" asChild>
        <Link href={saleLink}>
            <DollarSign className="mr-2 h-4 w-4" />
            Mark as Sold
        </Link>
      </Button>
    </div>
  );
}
