"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ListPlus, ExternalLink, Link, Check, X, Eye, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Supported platforms
const PLATFORMS = [
  { id: "ebay", name: "eBay", color: "bg-blue-500" },
  { id: "amazon", name: "Amazon", color: "bg-orange-500" },
  { id: "etsy", name: "Etsy", color: "bg-orange-400" },
  { id: "shopify", name: "Shopify", color: "bg-green-500" },
  { id: "instagram", name: "Instagram", color: "bg-pink-500" },
  { id: "facebook", name: "Facebook", color: "bg-blue-600" },
  { id: "website", name: "Website", color: "bg-purple-500" },
  { id: "other", name: "Other", color: "bg-gray-500" },
];

// Listing status options
const LISTING_STATUSES = [
  { id: "active", name: "Active", color: "bg-green-500" },
  { id: "sold", name: "Sold", color: "bg-blue-500" },
  { id: "reserved", name: "Reserved", color: "bg-yellow-500" },
  { id: "ended", name: "Ended", color: "bg-red-500" },
  { id: "draft", name: "Draft", color: "bg-gray-500" },
];

interface Listing {
  id: string;
  inventoryId: string;
  sku: string;
  itemName: string;
  platform: string;
  listingUrl: string;
  listingId?: string;
  status: string;
  price?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface BulkListingsProps {
  inventoryItems: Array<{
    id: string;
    sku: string;
    itemName: string;
    category: string;
    gemType: string;
    color: string;
    weightValue: number;
    sellingPrice: number;
    status: string;
  }>;
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function BulkListings({ 
  inventoryItems,
  label = "Bulk Listings", 
  variant = "outline",
  size = "sm",
  className 
}: BulkListingsProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"create" | "manage">("create");
  const [loading, setLoading] = useState(false);
  
  // Create listings state
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [platform, setPlatform] = useState("ebay");
  const [defaultUrl, setDefaultUrl] = useState("");
  const [listings, setListings] = useState<Listing[]>([]);

  // Manage listings state
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const toggleItem = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedItems.length === inventoryItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(inventoryItems.map(i => i.id));
    }
  };

  const handleCreateListings = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    if (!platform) {
      toast.error("Please select a platform");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/inventory/listings/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryIds: selectedItems,
          platform,
          defaultUrl: defaultUrl || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create listings");
      }

      const result = await response.json();
      setListings(result.listings || []);
      toast.success(`Created ${result.count} listings`);
      
      if (result.listings?.length > 0) {
        setActiveTab("manage");
      }
    } catch (error) {
      toast.error("Failed to create listings");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateListingUrl = async (listingId: string, newUrl: string) => {
    try {
      const response = await fetch(`/api/inventory/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingUrl: newUrl }),
      });

      if (!response.ok) {
        throw new Error("Failed to update listing");
      }

      setListings(prev => prev.map(l => 
        l.id === listingId ? { ...l, listingUrl: newUrl } : l
      ));
      toast.success("Listing URL updated");
    } catch (error) {
      toast.error("Failed to update listing");
      console.error(error);
    }
  };

  const handleUpdateStatus = async (listingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/inventory/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setListings(prev => prev.map(l => 
        l.id === listingId ? { ...l, status: newStatus } : l
      ));
      toast.success("Status updated");
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const filteredListings = listings.filter(l => {
    if (filterPlatform !== "all" && l.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    return true;
  });

  const getPlatformBadge = (platformId: string) => {
    const p = PLATFORMS.find(p => p.id === platformId);
    return p ? (
      <Badge className={`${p.color} text-white`}>
        {p.name}
      </Badge>
    ) : <Badge>{platformId}</Badge>;
  };

  const getStatusBadge = (statusId: string) => {
    const s = LISTING_STATUSES.find(s => s.id === statusId);
    return s ? (
      <Badge className={`${s.color} text-white`}>
        {s.name}
      </Badge>
    ) : <Badge>{statusId}</Badge>;
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <ListPlus className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Bulk Listings Management
            </DialogTitle>
            <DialogDescription>
              Create and manage listings across multiple platforms. Store listing URLs for tracking and backlisting.
            </DialogDescription>
          </DialogHeader>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <Button
              variant={activeTab === "create" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("create")}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              Create Listings
            </Button>
            <Button
              variant={activeTab === "manage" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("manage")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Manage Listings ({listings.length})
            </Button>
          </div>

          {activeTab === "create" ? (
            <div className="space-y-6">
              {/* Platform Selection */}
              <div className="space-y-2">
                <Label>Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Default URL Template */}
              <div className="space-y-2">
                <Label htmlFor="defaultUrl">Default Listing URL (optional)</Label>
                <Input
                  id="defaultUrl"
                  placeholder="https://www.ebay.com/itm/..."
                  value={defaultUrl}
                  onChange={(e) => setDefaultUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to create placeholder listings that you can update later with actual URLs.
                </p>
              </div>

              {/* Inventory Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Items to List ({selectedItems.length} selected)</Label>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedItems.length === inventoryItems.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Select</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryItems.map(item => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>₹{item.sellingPrice}</TableCell>
                          <TableCell>
                            <Badge variant={item.status === "AVAILABLE" ? "default" : "secondary"}>
                              {item.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>Platform</Label>
                  <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Platforms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Platforms</SelectItem>
                      {PLATFORMS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label>Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {LISTING_STATUSES.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Listings Table */}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Listing URL</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No listings found. Create listings in the "Create Listings" tab.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredListings.map(listing => (
                        <TableRow key={listing.id}>
                          <TableCell className="font-medium">{listing.sku}</TableCell>
                          <TableCell>{getPlatformBadge(listing.platform)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                value={listing.listingUrl}
                                onChange={(e) => handleUpdateListingUrl(listing.id, e.target.value)}
                                placeholder="https://..."
                                className="w-64"
                              />
                              {listing.listingUrl && (
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => window.open(listing.listingUrl, "_blank")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={listing.status} 
                              onValueChange={(v) => handleUpdateStatus(listing.id, v)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {LISTING_STATUSES.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                navigator.clipboard.writeText(listing.listingUrl);
                                toast.success("URL copied");
                              }}
                            >
                              <Link className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {activeTab === "create" && (
              <Button 
                onClick={handleCreateListings} 
                disabled={loading || selectedItems.length === 0}
              >
                {loading ? "Creating..." : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Create {selectedItems.length} Listings
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
