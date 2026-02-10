"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InventoryActions } from "@/components/inventory/inventory-actions";
import { InventoryCardMedia } from "@/components/inventory/inventory-card-media";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BulkEditDialog } from "./bulk-edit-dialog";
import { Edit } from "lucide-react";

interface InventoryTableProps {
  data: any[];
  vendors: any[];
  categories: any[];
  gemstones: any[];
  colors: any[];
  rashis: any[];
  certificates: any[];
  collections: any[];
}

export function InventoryTable({
  data,
  vendors,
  categories,
  gemstones,
  colors,
  rashis,
  certificates,
  collections,
}: InventoryTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);

  const vendorMap = useMemo(() => {
    const map = new Map<string, string>();
    vendors.forEach((v) => map.set(v.id, v.name));
    return map;
  }, [vendors]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
          <span className="text-sm font-medium ml-2">{selectedIds.length} items selected</span>
          <Button size="sm" onClick={() => setIsBulkEditDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Bulk Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
            Clear Selection
          </Button>
        </div>
      )}

      <div className="rounded-md border hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-[60px]">Image</TableHead>
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead className="min-w-[200px]">Item Name</TableHead>
              <TableHead className="w-[100px]">Category</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[80px]">Color</TableHead>
              <TableHead className="w-[80px]">Cut</TableHead>
              <TableHead className="w-[100px]">Weight</TableHead>
              <TableHead className="w-[150px]">Certificates</TableHead>
              <TableHead className="w-[80px]">Ratti</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[100px]">Vendor</TableHead>
              <TableHead className="w-[100px]">Location</TableHead>
              <TableHead className="w-[100px]">Date Added</TableHead>
              <TableHead className="w-[60px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={16} className="h-24 text-center">
                  No inventory items found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item) => {
                const price =
                  item.pricingMode === "PER_CARAT"
                    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                    : item.flatSellingPrice || 0;
                
                return (
                    <TableRow key={item.id} data-state={selectedIds.includes(item.id) ? "selected" : undefined}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectOne(item.id, !!checked)}
                        aria-label={`Select ${item.sku}`}
                      />
                    </TableCell>
                    <TableCell>
                      <InventoryCardMedia item={item} className="h-12 w-12" />
                    </TableCell>
                    <TableCell className="font-medium font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link href={`/inventory/${item.id}`} className="hover:underline font-medium">
                            {item.itemName}
                        </Link>
                        {item.internalName && (
                          <span className="text-xs text-muted-foreground">
                            {item.internalName}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{item.gemType}</span>
                        {(item.category === "Bracelets" || item.category === "Bracelet") && (
                          <span className="text-[10px] text-muted-foreground">
                            {[
                                item.braceletType,
                                item.standardSize,
                                item.beadSizeMm ? `${item.beadSizeMm}mm` : null
                            ].filter(Boolean).join(" • ")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{item.colorCode?.name || "-"}</TableCell>
                    <TableCell>{item.cutCode?.name || "-"}</TableCell>
                    <TableCell>
                      {item.weightValue} {item.weightUnit}
                    </TableCell>
                    <TableCell className="text-xs">
                        {item.certificates?.map((c: any) => c.remarks ? `${c.name} (${c.remarks})` : c.name).join(", ") || item.certification || "-"}
                    </TableCell>
                    <TableCell>
                      {item.weightRatti ? item.weightRatti.toFixed(2) : "-"}
                    </TableCell>
                    <TableCell>{formatCurrency(price)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "IN_STOCK"
                            ? "default"
                            : item.status === "SOLD"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {item.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{(item.vendorId && vendorMap.get(item.vendorId)) || "-"}</TableCell>
                    <TableCell className="text-xs">{item.stockLocation || "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <InventoryActions item={item} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <BulkEditDialog 
        selectedIds={selectedIds}
        open={isBulkEditDialogOpen}
        onOpenChange={setIsBulkEditDialogOpen}
        onSuccess={() => setSelectedIds([])}
        categories={categories}
        gemstones={gemstones}
        colors={colors}
        rashis={rashis}
        certificates={certificates}
        vendors={vendors}
        collections={collections}
      />
    </div>
  );
}
