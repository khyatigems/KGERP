"use client";

import { CsvImporter } from "@/components/ui/csv-importer";
import { importPurchases } from "../actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ImportPurchasesPage() {
  const headers = [
    "vendorName", "purchaseDate", "invoiceNo", "paymentMode", "paymentStatus",
    "itemName", "category", "shape", "beadSizeMm", "weightType",
    "quantity", "costPerUnit", "totalCost", "remarks", "itemRemarks"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
            <Link href="/purchases"><ArrowLeft className="mr-2 h-4 w-4"/> Back</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Import Purchases</h1>
      </div>

      <div className="prose dark:prose-invert">
        <p>Upload a CSV or Excel file. Each row will be created as a separate purchase record.</p>
      </div>

      <CsvImporter onImport={importPurchases} templateHeaders={headers} />
    </div>
  );
}
