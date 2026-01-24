import { CsvImporter } from "@/components/ui/csv-importer";
import { importInventory } from "../actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { checkPermission } from "@/lib/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";

export default async function ImportInventoryPage() {
  const perm = await checkPermission(PERMISSIONS.INVENTORY_CREATE);
  if (!perm.success) {
    return (
      <div className="p-6">
        <div className="bg-destructive/15 text-destructive border-destructive/20 border px-4 py-3 rounded-md relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> {perm.message}</span>
        </div>
      </div>
    );
  }

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
