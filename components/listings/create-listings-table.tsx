"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inventory } from "@prisma/client";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addListing } from "@/app/(dashboard)/inventory/listing-actions";

import { toast } from "sonner";

type InventoryWithListings = Inventory & {
  listings: { platform: string }[];
};

interface CreateListingsTableProps {
  data: InventoryWithListings[];
}

export function CreateListingsTable({ data }: CreateListingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleBulkCreate = async () => {
      if (!platform) return;
      setIsSubmitting(true);
      
      try {
          const promises = Array.from(selectedIds).map(inventoryId => {
              const item = data.find(i => i.id === inventoryId);
              if (!item) return Promise.resolve();
              
              const price = item.pricingMode === "PER_CARAT" 
                ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                : item.flatSellingPrice || 0;

              return addListing({
                  inventoryId,
                  platform,
                  listedPrice: price,
                  status: "LISTED",
                  listingUrl: "",
                  listingRef: ""
              });
          });
          
          await Promise.all(promises);
          setIsDialogOpen(false);
          setSelectedIds(new Set());
          toast.success("Listings created successfully");
          window.location.reload();
      } catch (error) {
          console.error("Failed to create listings", error);
          toast.error("Failed to create some listings");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
        <div className="text-sm text-muted-foreground">
          {selectedIds.size} items selected
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button disabled={selectedIds.size === 0}>
                    Create Listings ({selectedIds.size})
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Bulk Create Listings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Platform</Label>
                        <Select onValueChange={setPlatform}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Platform" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="eBay">eBay</SelectItem>
                                <SelectItem value="Etsy">Etsy</SelectItem>
                                <SelectItem value="Amazon">Amazon</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        This will create active listings for {selectedIds.size} items with their current selling price.
                    </p>
                    <Button onClick={handleBulkCreate} disabled={!platform || isSubmitting} className="w-full">
                        {isSubmitting ? "Creating..." : "Confirm Create"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
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
              <TableHead>Price</TableHead>
              <TableHead>Listed On</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No eligible items found.
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
                  <TableCell>
                    {formatCurrency(
                        item.pricingMode === "PER_CARAT"
                        ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                        : item.flatSellingPrice || 0
                    )}
                  </TableCell>
                  <TableCell>
                    {item.listings && item.listings.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                            {item.listings.map((l, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                    {l.platform}
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-sm">Not Listed Yet</span>
                    )}
                  </TableCell>
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
