"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inventory } from "@prisma/client-custom-v2";
import { LabelPrintDialog } from "@/components/inventory/label-print-dialog";
import { LabelItem } from "@/lib/label-generator";
import { formatCurrency } from "@/lib/utils";

// Helper to calculate price
const getPrice = (item: Inventory) => {
    return item.pricingMode === "PER_CARAT"
        ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
        : item.flatSellingPrice || 0;
};

interface InventoryWithRelations extends Inventory {
    categoryCode?: { name: string } | null;
    gemstoneCode?: { name: string } | null;
    colorCode?: { name: string } | null;
}

interface LabelPrintingTableProps {
    data: InventoryWithRelations[];
}

export function LabelPrintingTable({ data }: LabelPrintingTableProps) {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const toggleSelectAll = () => {
        if (selectedIds.size === data.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(data.map(item => item.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const selectedItems = data.filter(item => selectedIds.has(item.id));
    
    // Map to LabelItem
    const labelItems: LabelItem[] = selectedItems.map(item => ({
        id: item.id,
        sku: item.sku,
        itemName: item.itemName,
        gemType: item.gemType || "",
        color: item.colorCode?.name || "",
        weightValue: item.weightValue || 0,
        weightUnit: item.weightUnit || "",
        weightRatti: item.weightRatti,
        sellingPrice: getPrice(item),
        pricingMode: item.pricingMode || "FLAT",
        sellingRatePerCarat: item.sellingRatePerCarat || 0
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
                <div className="text-sm text-muted-foreground">
                    {selectedIds.size} items selected
                </div>
                <LabelPrintDialog 
                    items={labelItems} 
                    trigger={
                        <Button disabled={selectedIds.size === 0}>
                            Print Labels ({selectedIds.size})
                        </Button>
                    }
                />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox 
                                    checked={selectedIds.size === data.length && data.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Item Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Color</TableHead>
                            <TableHead>Weight</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    No items found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map(item => (
                                <TableRow key={item.id} data-state={selectedIds.has(item.id) ? "selected" : undefined}>
                                    <TableCell>
                                        <Checkbox 
                                            checked={selectedIds.has(item.id)}
                                            onCheckedChange={() => toggleSelect(item.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono">{item.sku}</TableCell>
                                    <TableCell>{item.itemName}</TableCell>
                                    <TableCell>{item.category}</TableCell>
                                    <TableCell>{item.colorCode?.name || "-"}</TableCell>
                                    <TableCell>{item.weightValue} {item.weightUnit}</TableCell>
                                    <TableCell>{formatCurrency(getPrice(item))}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{item.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
