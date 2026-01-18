"use client";

import { CsvImporter } from "@/components/ui/csv-importer";
import { importInventory } from "../actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ImportInventoryPage() {
  const headers = [
    "itemName", "categoryCode", "gemstoneCode", "colorCode", "color", "gemType", "shape", "weightValue", "weightUnit", 
    "vendorName", "pricingMode", "purchaseRatePerCarat", 
    "sellingRatePerCarat", "flatPurchaseCost", "flatSellingPrice",
    "stockLocation", "notes"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" asChild>
            <Link href="/inventory"><ArrowLeft className="mr-2 h-4 w-4"/> Back</Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Import Inventory</h1>
      </div>

      <div className="prose dark:prose-invert">
        <p>Upload a CSV or Excel file with the following headers:</p>
      </div>

      <CsvImporter onImport={importInventory} templateHeaders={headers} />
    </div>
  );
}
