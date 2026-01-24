"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Inventory } from "@prisma/client-custom-v2";
import { formatCurrency } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [platform, setPlatform] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [listingPrices, setListingPrices] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isDialogOpen) {
        const initialPrices: Record<string, string> = {};
        selectedIds.forEach(id => {
            const item = data.find(i => i.id === id);
            if (item) {
                const price = item.pricingMode === "PER_CARAT" 
                    ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                    : item.flatSellingPrice || 0;
                initialPrices[id] = price.toFixed(2);
            }
        });
        setListingPrices(initialPrices);
    }
  }, [isDialogOpen, selectedIds, data]);

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

  const handlePriceChange = (id: string, value: string) => {
    setListingPrices(prev => ({
        ...prev,
        [id]: value
    }));
  };

  const handleBulkCreate = async () => {
      if (!platform) return;
      
      // Validate all prices
      const invalidPrices = Array.from(selectedIds).some(id => {
          const price = parseFloat(listingPrices[id] || "0");
          return isNaN(price) || price <= 0;
      });

      if (invalidPrices) {
          toast.error("Please enter valid prices for all items");
          return;
      }

      if (!platform) {
          toast.error("Please select a platform");
          return;
      }

      setIsSubmitting(true);
      
      try {
          const results = await Promise.all(
              Array.from(selectedIds).map(async (inventoryId) => {
                  const item = data.find(i => i.id === inventoryId);
                  if (!item) return { success: false };
                  
                  const priceValue = parseFloat(listingPrices[inventoryId]);

                  return addListing({
                        inventoryId,
                        platform,
                        listedPrice: priceValue,
                        currency: currency,
                        status: "LISTED",
                        listingUrl: "",
                        listingRef: ""
                    });
              })
          );
          
          const failures = results.filter(r => !r.success);
          
          if (failures.length > 0) {
              console.error("Some listings failed:", JSON.stringify(failures, null, 2));
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const firstFailure = failures[0] as any;
              const errorMsg = firstFailure.message || "Unknown error";
              const detailMsg = firstFailure.errors ? JSON.stringify(firstFailure.errors) : "";
              toast.error(`Failed to create ${failures.length} listings: ${errorMsg} ${detailMsg}`);
          } else {
              toast.success("Listings created successfully");
              setIsDialogOpen(false);
              setSelectedIds(new Set());
              router.refresh();
          }
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Create Listings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Platform</Label>
                            <Select onValueChange={setPlatform} value={platform}>
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
                        <div className="space-y-2">
                            <Label>Currency (Display)</Label>
                            <Select onValueChange={setCurrency} value={currency}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INR">INR (₹)</SelectItem>
                                    <SelectItem value="USD">USD ($)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>System Price (INR)</TableHead>
                                    <TableHead>Listing Price ({currency})</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {Array.from(selectedIds).map(id => {
                                    const item = data.find(i => i.id === id);
                                    if (!item) return null;
                                    const systemPrice = item.pricingMode === "PER_CARAT" 
                                        ? (item.sellingRatePerCarat || 0) * (item.weightValue || 0)
                                        : item.flatSellingPrice || 0;
                                    
                                    return (
                                        <TableRow key={id}>
                                            <TableCell className="font-mono">{item.sku}</TableCell>
                                            <TableCell>{formatCurrency(systemPrice, "INR")}</TableCell>
                                            <TableCell>
                                                <div className="relative">
                                                    <span className="absolute left-2 top-2.5 text-muted-foreground text-sm">
                                                        {currency === "USD" ? "$" : "₹"}
                                                    </span>
                                                    <Input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        className="pl-6"
                                                        value={listingPrices[id] || ""}
                                                        onChange={(e) => handlePriceChange(id, e.target.value)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <p className="text-sm text-muted-foreground">
                        This will create active listings for {selectedIds.size} items.
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
