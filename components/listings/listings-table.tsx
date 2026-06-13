"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Listing } from "@prisma/client";
import { Download, Loader2, RefreshCw, Eye, History, ExternalLink, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { deleteListings, updateListingsStatus, getListingHistory } from "@/app/(dashboard)/inventory/listing-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useGlobalLoader } from "@/components/global-loader-provider";

interface ListingsTableProps {
  data: (Listing & { 
    inventory: { sku: string; itemName: string };
    priceHistory: { price: number; changedAt: Date }[];
  })[];
}

export function ListingsTable({ data }: ListingsTableProps) {
  const router = useRouter();
  const { showLoader, hideLoader } = useGlobalLoader();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [platformFilter, setPlatformFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [skuSearch, setSkuSearch] = useState("");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const [selectedListing, setSelectedListing] = useState<typeof data[number] | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [listingHistory, setListingHistory] = useState<{ price: number; changedAt: Date | string; changedBy?: string }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const filteredData = data.filter(item => {
    const itemDate = new Date(item.listedDate);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start) start.setHours(0,0,0,0);
    if (end) end.setHours(23,59,59,999);

    const dateMatch = (!start || itemDate >= start) && (!end || itemDate <= end);
    const platformMatch = platformFilter === "ALL" || !platformFilter || item.platform === platformFilter;
    const statusMatch = statusFilter === "ALL" || !statusFilter || item.status === statusFilter;
    const skuMatch = !skuSearch || item.inventory.sku.toLowerCase().includes(skuSearch.toLowerCase());

    return dateMatch && platformMatch && statusMatch && skuMatch;
  });

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredData.map(item => item.id)));
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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
        const result = await deleteListings(Array.from(selectedIds));
        if (result.success) {
            toast.success("Listings deleted successfully");
            setSelectedIds(new Set());
            setIsDeleteOpen(false);
            router.refresh();
        } else {
            toast.error(result.message || "Failed to delete listings");
        }
    } catch (error) {
        console.error(error);
        toast.error("An error occurred");
    } finally {
        setIsDeleting(false);
    }
  };

  const handleBulkStatusUpdate = async () => {
    if (selectedIds.size === 0 || !pendingStatus) return;
    setIsUpdatingStatus(true);
    try {
        const result = await updateListingsStatus(Array.from(selectedIds), pendingStatus);
        if (result.success) {
            toast.success(`Listings marked as ${pendingStatus}`);
            setSelectedIds(new Set());
            setIsStatusConfirmOpen(false);
            router.refresh();
        } else {
            toast.error(result.message || "Failed to update listings");
        }
    } catch (error) {
        console.error(error);
        toast.error("An error occurred");
    } finally {
        setIsUpdatingStatus(false);
    }
  };

  const confirmStatusUpdate = (status: string) => {
      setPendingStatus(status);
      setIsStatusConfirmOpen(true);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    showLoader();
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
      hideLoader();
    }, 1000);
  };

  const handleExport = () => {
    const exportData = filteredData.map(item => ({
        SKU: item.inventory.sku,
        Item: item.inventory.itemName,
        Platform: item.platform,
        Currency: item.currency || "INR",
        "Listed Price": item.listedPrice,
        "Listed Date": formatDate(item.listedDate),
        Status: item.status,
        "Link/Ref": item.listingUrl || item.listingRef || ""
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Listings");
    XLSX.writeFile(wb, `listings_export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const resetFilters = () => {
      setStartDate("");
      setEndDate("");
      setPlatformFilter("ALL");
      setStatusFilter("ALL");
      setSkuSearch("");
  };

  const handleViewListing = async (listing: typeof data[number]) => {
    setSelectedListing(listing);
    setIsDetailOpen(true);
    setIsLoadingHistory(true);
    try {
      const res = await getListingHistory(listing.id);
      if (res.success) setListingHistory(res.history);
    } catch {
      setListingHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const hasActiveFilters = startDate || endDate || platformFilter !== "ALL" || statusFilter !== "ALL" || skuSearch;
  
  const selectedListings = filteredData.filter(item => selectedIds.has(item.id));
  const areAllSelectedActive = selectedListings.length > 0 && selectedListings.every(item => item.status === "LISTED" || item.status === "ACTIVE");
  const areAllSelectedInactive = selectedListings.length > 0 && selectedListings.every(item => item.status === "INACTIVE");

  return (
    <div className="space-y-4">
        <Dialog open={isStatusConfirmOpen} onOpenChange={setIsStatusConfirmOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Status Change</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to mark {selectedIds.size} listings as {pendingStatus}?
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsStatusConfirmOpen(false)}>Cancel</Button>
                    <Button onClick={handleBulkStatusUpdate} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? "Updating..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <div className="flex flex-col gap-4 bg-card p-4 rounded-lg border">
            <div className="flex flex-wrap gap-4 items-end justify-between w-full">
                <div className="flex flex-wrap gap-4 items-end">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">SKU Search</label>
                        <Input 
                            placeholder="Search SKU..."
                            value={skuSearch}
                            onChange={(e) => setSkuSearch(e.target.value)}
                            className="w-[180px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Platform</label>
                        <Select value={platformFilter} onValueChange={setPlatformFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Platforms" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Platforms</SelectItem>
                                <SelectItem value="eBay">eBay</SelectItem>
                                <SelectItem value="Etsy">Etsy</SelectItem>
                                <SelectItem value="Amazon">Amazon</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="LISTED">Active / Listed</SelectItem>
                                <SelectItem value="SOLD">Sold</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Start Date</label>
                        <Input 
                            type="date" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-[150px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">End Date</label>
                        <Input 
                            type="date" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-[150px]"
                        />
                    </div>
                </div>
                
                <div className="flex gap-2">
                    {hasActiveFilters && (
                        <Button variant="ghost" onClick={resetFilters}>
                            Reset Filters
                        </Button>
                    )}
                    <Button onClick={handleRefresh} variant="outline" size="icon" title="Refresh Listings">
                        <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    </Button>
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md border">
                    <span className="text-sm font-medium ml-2">{selectedIds.size} listings selected</span>
                    <div className="ml-auto flex gap-2">
                        {!areAllSelectedActive && (
                            <Button 
                                variant="default" 
                                size="sm" 
                                onClick={() => confirmStatusUpdate("LISTED")}
                                disabled={isUpdatingStatus}
                            >
                                Set Active
                            </Button>
                        )}
                        {!areAllSelectedInactive && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={() => confirmStatusUpdate("INACTIVE")}
                                disabled={isUpdatingStatus}
                            >
                                Set Inactive
                            </Button>
                        )}
                        <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => setIsDeleteOpen(true)}
                        >
                            Delete Selected
                        </Button>
                    </div>
                </div>
            )}
        </div>

        <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={filteredData.length > 0 && selectedIds.size === filteredData.length}
                    onCheckedChange={toggleSelectAll}
                  />
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Listed Price</TableHead>
              <TableHead>Listed Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Link / Ref</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No listings found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((listing) => (
                <TableRow 
                  key={listing.id} 
                  data-state={selectedIds.has(listing.id) ? "selected" : undefined}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewListing(listing)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox 
                        checked={selectedIds.has(listing.id)}
                        onCheckedChange={() => toggleSelect(listing.id)}
                      />
                  </TableCell>
                  <TableCell className="font-mono">
                    {listing.inventory.sku}
                  </TableCell>
                  <TableCell>{listing.inventory.itemName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{listing.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="font-mono">
                        {formatCurrency(listing.listedPrice, listing.currency || "INR")}
                      </Badge>
                      {listing.priceHistory.length > 0 && (() => {
                        const original = listing.priceHistory[0].price;
                        const diff = listing.listedPrice - original;
                        if (Math.abs(diff) < 0.001) {
                          return (
                            <span className="text-muted-foreground" title={`Original: ${formatCurrency(original, listing.currency || "INR")}`}>
                              <Minus className="h-3.5 w-3.5" />
                            </span>
                          );
                        }
                        const pct = ((diff / original) * 100).toFixed(1);
                        return (
                          <span 
                            className={`flex items-center text-xs font-medium ${diff > 0 ? "text-green-600" : "text-red-600"}`}
                            title={`Original: ${formatCurrency(original, listing.currency || "INR")} → Now: ${formatCurrency(listing.listedPrice, listing.currency || "INR")}`}
                          >
                            {diff > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                            {pct}%
                          </span>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatDate(listing.listedDate)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        listing.status === "LISTED" || listing.status === "ACTIVE"
                          ? "default"
                          : listing.status === "SOLD"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {listing.status}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {listing.listingUrl ? (
                      <a
                        href={listing.listingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Link
                      </a>
                    ) : (
                      listing.listingRef || "-"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>

        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete {selectedIds.size} listings? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleting}>Cancel</Button>
                    <Button variant="destructive" onClick={handleBulkDelete} disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Eye className="h-5 w-5" />
                        Listing Details
                    </DialogTitle>
                </DialogHeader>
                {selectedListing && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span className="text-muted-foreground text-xs">SKU</span>
                                <p className="font-mono font-medium">{selectedListing.inventory.sku}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Item</span>
                                <p className="font-medium">{selectedListing.inventory.itemName}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Platform</span>
                                <p><Badge variant="secondary">{selectedListing.platform}</Badge></p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Status</span>
                                <p>
                                    <Badge variant={selectedListing.status === "LISTED" || selectedListing.status === "ACTIVE" ? "default" : "outline"}>
                                        {selectedListing.status}
                                    </Badge>
                                </p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Listed Price</span>
                                <p className="font-mono font-medium text-lg">{formatCurrency(selectedListing.listedPrice, selectedListing.currency || "INR")}</p>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs">Listed Date</span>
                                <p>{formatDate(selectedListing.listedDate)}</p>
                            </div>
                        </div>

                        {selectedListing.listingUrl && (
                            <div className="text-sm">
                                <span className="text-muted-foreground text-xs">Listing URL</span>
                                <p>
                                    <a 
                                        href={selectedListing.listingUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        {selectedListing.listingUrl.length > 60 ? selectedListing.listingUrl.substring(0, 60) + "..." : selectedListing.listingUrl}
                                    </a>
                                </p>
                            </div>
                        )}

                        <div className="border-t pt-3">
                            <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                                <History className="h-4 w-4" />
                                Price History
                            </h4>
                            {isLoadingHistory ? (
                                <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                            ) : listingHistory.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-3">No price history recorded.</p>
                            ) : (
                                <div className="space-y-0">
                                    {listingHistory.map((h, i) => {
                                        const isFirst = i === listingHistory.length - 1;
                                        const prevPrice = i < listingHistory.length - 1 ? listingHistory[i + 1].price : null;
                                        const diff = prevPrice !== null ? h.price - prevPrice : null;
                                        return (
                                            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isFirst ? "bg-blue-500" : "bg-muted-foreground/40"}`} />
                                                    <span className="font-mono font-medium">{formatCurrency(h.price, selectedListing.currency || "INR")}</span>
                                                    {diff !== null && Math.abs(diff) > 0.001 && (
                                                        <span className={`text-xs font-medium ${diff > 0 ? "text-green-600" : "text-red-600"}`}>
                                                            {diff > 0 ? "↑" : "↓"} {formatCurrency(Math.abs(diff), selectedListing.currency || "INR")}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-muted-foreground">
                                                    <div>{new Date(h.changedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                                                    <div className="text-[10px]">{new Date(h.changedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </div>
  );
}
