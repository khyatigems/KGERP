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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet, ExternalLink } from "lucide-react";
import { toast } from "sonner";

// Comprehensive field definitions - ALL fields from inventory
const ALL_EXPORT_FIELDS = [
  // Basic Information
  { key: "sku", label: "SKU", category: "Basic", default: true },
  { key: "itemName", label: "Item Name", category: "Basic", default: true },
  { key: "internalName", label: "Internal Name", category: "Basic", default: false },
  { key: "category", label: "Category", category: "Basic", default: true },
  { key: "gemType", label: "Gem Type", category: "Basic", default: true },
  { key: "stoneType", label: "Stone Type", category: "Basic", default: false },
  { key: "description", label: "Description", category: "Basic", default: false },
  
  // Classification & Codes
  { key: "categoryCode", label: "Category Code", category: "Codes", default: false },
  { key: "gemstoneCode", label: "Gemstone Code", category: "Codes", default: false },
  { key: "colorCode", label: "Color Code", category: "Codes", default: false },
  { key: "cutCode", label: "Cut Code", category: "Codes", default: false },
  { key: "collectionCode", label: "Collection", category: "Codes", default: true },
  { key: "hsnCode", label: "HSN Code", category: "Codes", default: false },
  { key: "qcCode", label: "QC Code", category: "Codes", default: false },
  
  // Physical Properties
  { key: "weightValue", label: "Weight Value", category: "Physical", default: true },
  { key: "weightUnit", label: "Weight Unit", category: "Physical", default: true },
  { key: "carats", label: "Carats", category: "Physical", default: true },
  { key: "weightRatti", label: "Weight (Ratti)", category: "Physical", default: true },
  { key: "weightGrams", label: "Weight (Grams)", category: "Physical", default: false },
  { key: "pieces", label: "Pieces", category: "Physical", default: false },
  { key: "shape", label: "Shape", category: "Physical", default: true },
  { key: "color", label: "Color", category: "Physical", default: true },
  { key: "clarity", label: "Clarity", category: "Physical", default: false },
  { key: "clarityGrade", label: "Clarity Grade", category: "Physical", default: false },
  { key: "cut", label: "Cut", category: "Physical", default: false },
  { key: "cutGrade", label: "Cut Grade", category: "Physical", default: false },
  { key: "polish", label: "Polish", category: "Physical", default: false },
  { key: "symmetry", label: "Symmetry", category: "Physical", default: false },
  { key: "fluorescence", label: "Fluorescence", category: "Physical", default: false },
  { key: "measurements", label: "Measurements", category: "Physical", default: false },
  { key: "dimensionsMm", label: "Dimensions (mm)", category: "Physical", default: true },
  { key: "tablePercent", label: "Table %", category: "Physical", default: false },
  { key: "depthPercent", label: "Depth %", category: "Physical", default: false },
  { key: "ratio", label: "Ratio", category: "Physical", default: false },
  { key: "transparency", label: "Transparency", category: "Physical", default: false },
  
  // Origin & Treatment
  { key: "origin", label: "Origin", category: "Origin", default: false },
  { key: "originCountry", label: "Origin Country", category: "Origin", default: false },
  { key: "treatment", label: "Treatment", category: "Origin", default: true },
  { key: "cutPolishedIn", label: "Cut/Polished In", category: "Origin", default: false },
  
  // Bracelet/Bead Specific
  { key: "braceletType", label: "Bracelet Type", category: "Bracelet", default: false },
  { key: "standardSize", label: "Standard Size", category: "Bracelet", default: false },
  { key: "beadSizeMm", label: "Bead Size (mm)", category: "Bracelet", default: false },
  { key: "beadSizeLabel", label: "Bead Size Label", category: "Bracelet", default: false },
  { key: "beadCount", label: "Bead Count", category: "Bracelet", default: false },
  { key: "holeSizeMm", label: "Hole Size (mm)", category: "Bracelet", default: false },
  { key: "innerCircumferenceMm", label: "Inner Circumference (mm)", category: "Bracelet", default: false },
  
  // Certification
  { key: "certificateNo", label: "Certificate No", category: "Certificate", default: false },
  { key: "certificateNumber", label: "Certificate Number", category: "Certificate", default: true },
  { key: "certification", label: "Certification", category: "Certificate", default: true },
  { key: "lab", label: "Lab", category: "Certificate", default: false },
  { key: "certificateLab", label: "Certificate Lab", category: "Certificate", default: false },
  { key: "certificateComments", label: "Certificate Comments", category: "Certificate", default: false },
  { key: "rashis", label: "Rashis", category: "Certificate", default: false },
  { key: "certificates", label: "Certificates", category: "Certificate", default: false },
  
  // Pricing
  { key: "pricingMode", label: "Pricing Mode", category: "Pricing", default: true },
  { key: "costPrice", label: "Cost Price", category: "Pricing", default: true },
  { key: "sellingPrice", label: "Selling Price", category: "Pricing", default: true },
  { key: "purchaseRatePerCarat", label: "Purchase Rate/Carat", category: "Pricing", default: false },
  { key: "sellingRatePerCarat", label: "Selling Rate/Carat", category: "Pricing", default: false },
  { key: "flatPurchaseCost", label: "Flat Purchase Cost", category: "Pricing", default: false },
  { key: "flatSellingPrice", label: "Flat Selling Price", category: "Pricing", default: false },
  { key: "profit", label: "Profit", category: "Pricing", default: false },
  { key: "rapPrice", label: "RAP Price", category: "Pricing", default: false },
  { key: "discountPercent", label: "Discount %", category: "Pricing", default: false },
  
  // Status & Location
  { key: "status", label: "Status", category: "Status", default: true },
  { key: "condition", label: "Condition", category: "Status", default: false },
  { key: "location", label: "Location", category: "Status", default: false },
  { key: "stockLocation", label: "Stock Location", category: "Status", default: true },
  { key: "hideFromAttention", label: "Hide From Attention", category: "Status", default: false },
  { key: "pieces", label: "Pieces/Qty", category: "Status", default: true },
  
  // Vendor & Purchase
  { key: "vendorId", label: "Vendor ID", category: "Vendor", default: false },
  { key: "vendorName", label: "Vendor Name", category: "Vendor", default: true },
  { key: "purchaseId", label: "Purchase ID", category: "Vendor", default: false },
  { key: "batchId", label: "Batch ID", category: "Vendor", default: false },
  
  // Media
  { key: "imageUrl", label: "Image URL", category: "Media", default: true },
  { key: "videoUrl", label: "Video URL", category: "Media", default: false },
  { key: "mediaUrls", label: "All Media URLs", category: "Media", default: false },
  { key: "primaryMediaUrl", label: "Primary Media URL", category: "Media", default: true },
  
  // Notes
  { key: "notes", label: "Notes", category: "Notes", default: false },
  
  // Metadata
  { key: "createdAt", label: "Created At", category: "Metadata", default: false },
  { key: "updatedAt", label: "Updated At", category: "Metadata", default: false },
  { key: "id", label: "Inventory ID", category: "Metadata", default: false },
];

const CATEGORIES = Array.from(new Set(ALL_EXPORT_FIELDS.map(f => f.category)));

interface ComprehensiveExportProps {
  label?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function ComprehensiveExport({ 
  label = "Export Complete Inventory", 
  variant = "outline",
  size = "sm",
  className 
}: ComprehensiveExportProps) {
  const [open, setOpen] = useState(false);
  const [selectedFields, setSelectedFields] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(
      ALL_EXPORT_FIELDS.map(f => [f.key, f.default])
    );
  });
  const [includeAllStock, setIncludeAllStock] = useState(true);
  const [loading, setLoading] = useState(false);

  const toggleField = (key: string) => {
    setSelectedFields(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleCategory = (category: string, value: boolean) => {
    const categoryFields = ALL_EXPORT_FIELDS.filter(f => f.category === category);
    setSelectedFields(prev => ({
      ...prev,
      ...Object.fromEntries(categoryFields.map(f => [f.key, value]))
    }));
  };

  const selectAll = (value: boolean) => {
    setSelectedFields(prev => 
      Object.fromEntries(Object.keys(prev).map(key => [key, value]))
    );
  };

  const isCategorySelected = (category: string) => {
    const categoryFields = ALL_EXPORT_FIELDS.filter(f => f.category === category);
    return categoryFields.every(f => selectedFields[f.key]);
  };

  const isCategoryPartial = (category: string) => {
    const categoryFields = ALL_EXPORT_FIELDS.filter(f => f.category === category);
    const selected = categoryFields.filter(f => selectedFields[f.key]).length;
    return selected > 0 && selected < categoryFields.length;
  };

  const handleExport = async () => {
    const selected = Object.entries(selectedFields)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (selected.length === 0) {
      toast.error("Please select at least one field to export");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("fields", selected.join(","));
      if (includeAllStock) {
        params.set("status", "ALL");
        params.set("allStock", "true");
      }

      const response = await fetch(`/api/inventory/export/comprehensive?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-complete-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${selected.length} fields successfully`);
      setOpen(false);
    } catch (error) {
      toast.error("Failed to export inventory");
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
        <FileSpreadsheet className="mr-2 h-4 w-4" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Complete Inventory Export
            </DialogTitle>
            <DialogDescription>
              Select all fields you want to include in the export. This export includes ALL inventory data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Options */}
            <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
              <Checkbox 
                id="allStock" 
                checked={includeAllStock}
                onCheckedChange={(v) => setIncludeAllStock(Boolean(v))}
              />
              <Label htmlFor="allStock" className="font-medium cursor-pointer">
                Include ALL stock (InStock, Sold, Reserved, etc.)
              </Label>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                Select All Fields
              </Button>
              <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                Deselect All
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  ALL_EXPORT_FIELDS.forEach(f => {
                    if (f.default) toggleField(f.key);
                  });
                }}
              >
                Reset to Default
              </Button>
            </div>

            {/* Field Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CATEGORIES.map(category => {
                const fields = ALL_EXPORT_FIELDS.filter(f => f.category === category);
                const allSelected = isCategorySelected(category);
                const partial = isCategoryPartial(category);

                return (
                  <div key={category} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h4 className="font-semibold text-sm">{category}</h4>
                      <Checkbox 
                        checked={allSelected}
                        data-state={partial ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                        onCheckedChange={(v) => toggleCategory(category, Boolean(v))}
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {fields.map(field => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox 
                            id={field.key}
                            checked={selectedFields[field.key]}
                            onCheckedChange={() => toggleField(field.key)}
                          />
                          <Label 
                            htmlFor={field.key} 
                            className="text-sm cursor-pointer truncate"
                            title={field.label}
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="text-sm text-muted-foreground text-center">
              {Object.values(selectedFields).filter(Boolean).length} of {ALL_EXPORT_FIELDS.length} fields selected
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={loading || Object.values(selectedFields).filter(Boolean).length === 0}
            >
              {loading ? "Exporting..." : "Export to Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
