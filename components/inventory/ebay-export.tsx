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
import { Download, ExternalLink, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// eBay category mappings (simplified - you can expand these)
const EBAY_CATEGORIES = [
  { id: "35952", name: "Jewelry & Watches > Loose Diamonds & Gemstones" },
  { id: "164337", name: "Jewelry & Watches > Fine Jewelry > Fine Necklaces & Pendants" },
  { id: "164343", name: "Jewelry & Watches > Fine Jewelry > Fine Rings" },
  { id: "164358", name: "Jewelry & Watches > Fine Jewelry > Fine Bracelets" },
  { id: "164348", name: "Jewelry & Watches > Fine Jewelry > Fine Earrings" },
];

// eBay condition mappings
const EBAY_CONDITIONS = [
  { id: "1000", name: "New" },
  { id: "1500", name: "New other (see details)" },
  { id: "1750", name: "New with defects" },
  { id: "2000", name: "Manufacturer refurbished" },
  { id: "2500", name: "Seller refurbished" },
  { id: "3000", name: "Used" },
  { id: "4000", name: "Very Good" },
  { id: "5000", name: "Good" },
  { id: "6000", name: "Acceptable" },
  { id: "7000", name: "For parts or not working" },
];

// eBay format mappings
const EBAY_FORMATS = [
  { id: "FixedPrice", name: "Fixed Price (Buy It Now)" },
  { id: "Auction", name: "Auction" },
  { id: "AuctionWithBIN", name: "Auction with Buy It Now" },
];

interface EbayExportProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function EbayExport({ 
  label = "Export for eBay", 
  variant = "outline",
  size = "sm",
  className 
}: EbayExportProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // eBay listing settings
  const [settings, setSettings] = useState({
    categoryId: "35952",
    conditionId: "1000",
    format: "FixedPrice",
    duration: "GTC", // Good Till Cancelled
    quantity: "1",
    includeImages: true,
    includeDescription: true,
    useTemplate: true,
    includeMeasurements: true,
    includeCertificate: true,
    includeOrigin: true,
    autoPrice: true, // Calculate price from inventory
    markup: "20", // Default 20% markup
  });

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("categoryId", settings.categoryId);
      params.set("conditionId", settings.conditionId);
      params.set("format", settings.format);
      params.set("duration", settings.duration);
      params.set("quantity", settings.quantity);
      params.set("includeImages", settings.includeImages.toString());
      params.set("includeDescription", settings.includeDescription.toString());
      params.set("useTemplate", settings.useTemplate.toString());
      params.set("includeMeasurements", settings.includeMeasurements.toString());
      params.set("includeCertificate", settings.includeCertificate.toString());
      params.set("includeOrigin", settings.includeOrigin.toString());
      params.set("autoPrice", settings.autoPrice.toString());
      params.set("markup", settings.markup);
      params.set("status", "IN_STOCK"); // Only in-stock items

      const response = await fetch(`/api/inventory/export/ebay?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Export failed" }));
        throw new Error(errorData.message || errorData.error || "Export failed");
      }

      // Check if we got a JSON error response (empty data warning)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const jsonData = await response.json();
        if (jsonData.warning) {
          toast.warning(jsonData.message || "No items available for export");
          setLoading(false);
          return;
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ebay-listings-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("eBay export completed successfully");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to export for eBay");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <ShoppingCart className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Export for eBay
            </DialogTitle>
            <DialogDescription>
              Generate an Excel file formatted for eBay bulk upload with Cloudinary image URLs.
              This export includes all the necessary fields for creating eBay listings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* eBay Category */}
            <div className="space-y-2">
              <Label htmlFor="categoryId">eBay Category</Label>
              <Select 
                value={settings.categoryId} 
                onValueChange={(v) => handleSettingChange("categoryId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select eBay category" />
                </SelectTrigger>
                <SelectContent>
                  {EBAY_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition & Format */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conditionId">Condition</Label>
                <Select 
                  value={settings.conditionId} 
                  onValueChange={(v) => handleSettingChange("conditionId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {EBAY_CONDITIONS.map(cond => (
                      <SelectItem key={cond.id} value={cond.id}>{cond.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="format">Listing Format</Label>
                <Select 
                  value={settings.format} 
                  onValueChange={(v) => handleSettingChange("format", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {EBAY_FORMATS.map(fmt => (
                      <SelectItem key={fmt.id} value={fmt.id}>{fmt.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quantity & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Default Quantity</Label>
                <Input 
                  id="quantity"
                  type="number"
                  min="1"
                  value={settings.quantity}
                  onChange={(e) => handleSettingChange("quantity", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Select 
                  value={settings.duration} 
                  onValueChange={(v) => handleSettingChange("duration", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GTC">Good Till Cancelled</SelectItem>
                    <SelectItem value="Days_1">1 Day</SelectItem>
                    <SelectItem value="Days_3">3 Days</SelectItem>
                    <SelectItem value="Days_5">5 Days</SelectItem>
                    <SelectItem value="Days_7">7 Days</SelectItem>
                    <SelectItem value="Days_10">10 Days</SelectItem>
                    <SelectItem value="Days_30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing Options */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Pricing Options</h4>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="autoPrice"
                  checked={settings.autoPrice}
                  onCheckedChange={(v) => handleSettingChange("autoPrice", Boolean(v))}
                />
                <Label htmlFor="autoPrice" className="cursor-pointer">
                  Auto-calculate price from inventory selling price
                </Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="markup">Price Markup (%)</Label>
                  <Input 
                    id="markup"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.markup}
                    onChange={(e) => handleSettingChange("markup", e.target.value)}
                    disabled={!settings.autoPrice}
                  />
                </div>
              </div>
            </div>

            {/* Content Options */}
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Content to Include</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeImages"
                    checked={settings.includeImages}
                    onCheckedChange={(v) => handleSettingChange("includeImages", Boolean(v))}
                  />
                  <Label htmlFor="includeImages" className="text-sm cursor-pointer">
                    Cloudinary Image URLs
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeDescription"
                    checked={settings.includeDescription}
                    onCheckedChange={(v) => handleSettingChange("includeDescription", Boolean(v))}
                  />
                  <Label htmlFor="includeDescription" className="text-sm cursor-pointer">
                    Product Description
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeMeasurements"
                    checked={settings.includeMeasurements}
                    onCheckedChange={(v) => handleSettingChange("includeMeasurements", Boolean(v))}
                  />
                  <Label htmlFor="includeMeasurements" className="text-sm cursor-pointer">
                    Measurements & Dimensions
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeCertificate"
                    checked={settings.includeCertificate}
                    onCheckedChange={(v) => handleSettingChange("includeCertificate", Boolean(v))}
                  />
                  <Label htmlFor="includeCertificate" className="text-sm cursor-pointer">
                    Certificate Details
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeOrigin"
                    checked={settings.includeOrigin}
                    onCheckedChange={(v) => handleSettingChange("includeOrigin", Boolean(v))}
                  />
                  <Label htmlFor="includeOrigin" className="text-sm cursor-pointer">
                    Origin & Treatment
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="useTemplate"
                    checked={settings.useTemplate}
                    onCheckedChange={(v) => handleSettingChange("useTemplate", Boolean(v))}
                  />
                  <Label htmlFor="useTemplate" className="text-sm cursor-pointer">
                    Use eBay Template
                  </Label>
                </div>
              </div>
            </div>

            {/* Template Preview */}
            {settings.useTemplate && (
              <div className="space-y-2 p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium text-sm">eBay Template Preview</h4>
                <p className="text-xs text-muted-foreground">
                  The export will include a formatted HTML description with:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                  <li>Professional product layout</li>
                  <li>Cloudinary-hosted images embedded</li>
                  <li>Gemstone specifications table</li>
                  <li>Certificate & origin information</li>
                  <li>Khyati Gems branding</li>
                </ul>
              </div>
            )}

            {/* Instructions */}
            <div className="text-sm text-muted-foreground">
              <p className="font-medium">How to use:</p>
              <ol className="list-decimal list-inside space-y-1 mt-1">
                <li>Download the Excel file</li>
                <li>Go to eBay Seller Hub → Listings → Create Listings</li>
                <li>Select "Upload a file" option</li>
                <li>Upload the generated Excel file</li>
                <li>Review and submit listings</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={loading}
            >
              {loading ? "Generating..." : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download eBay Export
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
