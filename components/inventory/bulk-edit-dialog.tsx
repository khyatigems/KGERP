"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bulkUpdateInventory } from "@/app/(dashboard)/inventory/actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkEditDialogProps {
  selectedIds: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  categories: any[];
  gemstones: any[];
  colors: any[];
  rashis: any[];
  certificates: any[];
  vendors: any[];
  collections: any[];
}

export function BulkEditDialog({
  selectedIds,
  open,
  onOpenChange,
  onSuccess,
  categories,
  gemstones,
  colors,
  rashis,
  certificates,
  vendors,
  collections,
}: BulkEditDialogProps) {
  const [field, setField] = useState<string>("");
  const [value, setValue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!field) return;
    
    // Validate value for text fields
    if (field === "stockLocation" && value === null) {
        // Allow empty string for clearing location
    } else if (value === null && field !== "stockLocation") { // For others, require value? or allow clear?
        // Let's assume non-null for now unless it's a clearable field
        // But for selects, usually we select something.
    }

    setIsLoading(true);
    try {
      const result = await bulkUpdateInventory(selectedIds, { field, value });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Items updated successfully");
        onSuccess();
        onOpenChange(false);
        setField("");
        setValue(null);
      }
    } catch (error) {
      toast.error("Failed to update items");
    } finally {
      setIsLoading(false);
    }
  };

  const renderInput = () => {
    switch (field) {
      case "stockLocation":
        return <Input value={value || ""} onChange={(e) => setValue(e.target.value)} placeholder="Enter location" />;
      case "status":
        return (
          <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="IN_STOCK">In Stock</SelectItem>
              <SelectItem value="SOLD">Sold</SelectItem>
              <SelectItem value="MEMO">Memo</SelectItem>
              <SelectItem value="RESERVED">Reserved</SelectItem>
            </SelectContent>
          </Select>
        );
      case "categoryCodeId":
        return (
          <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "gemstoneCodeId":
        return (
           <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select Gemstone" /></SelectTrigger>
            <SelectContent>
              {gemstones.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "colorCodeId":
        return (
           <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "vendorId":
        return (
           <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger>
            <SelectContent>
              {vendors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "collectionCodeId":
        return (
           <Select onValueChange={setValue} value={value || ""}>
            <SelectTrigger><SelectValue placeholder="Select Collection" /></SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "rashiIds":
        return (
           <ScrollArea className="h-[200px] border rounded-md p-2">
             <div className="space-y-2">
               {rashis.map((r) => (
                 <div key={r.id} className="flex items-center space-x-2">
                   <Checkbox 
                     id={`rashi-${r.id}`} 
                     checked={(value as string[] || []).includes(r.id)}
                     onCheckedChange={(checked) => {
                       const current = (value as string[]) || [];
                       if (checked) setValue([...current, r.id]);
                       else setValue(current.filter(id => id !== r.id));
                     }}
                   />
                   <Label htmlFor={`rashi-${r.id}`}>{r.name}</Label>
                 </div>
               ))}
             </div>
           </ScrollArea>
        );
      case "certificateIds":
        return (
           <ScrollArea className="h-[200px] border rounded-md p-2">
             <div className="space-y-2">
               {certificates.map((c) => (
                 <div key={c.id} className="flex items-center space-x-2">
                   <Checkbox 
                     id={`cert-${c.id}`} 
                     checked={(value as string[] || []).includes(c.id)}
                     onCheckedChange={(checked) => {
                       const current = (value as string[]) || [];
                       if (checked) setValue([...current, c.id]);
                       else setValue(current.filter(id => id !== c.id));
                     }}
                   />
                   <Label htmlFor={`cert-${c.id}`}>{c.name}</Label>
                 </div>
               ))}
             </div>
           </ScrollArea>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedIds.length} Items</DialogTitle>
          <DialogDescription>Select a field to update for all selected items.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Field</Label>
            <Select onValueChange={(v) => { setField(v); setValue(null); }}>
              <SelectTrigger><SelectValue placeholder="Select field to edit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stockLocation">Location</SelectItem>
                <SelectItem value="status">Status</SelectItem>
                <SelectItem value="categoryCodeId">Category</SelectItem>
                <SelectItem value="gemstoneCodeId">Gemstone Type</SelectItem>
                <SelectItem value="colorCodeId">Color</SelectItem>
                <SelectItem value="rashiIds">Rashi</SelectItem>
                <SelectItem value="certificateIds">Certificates</SelectItem>
                <SelectItem value="vendorId">Vendor</SelectItem>
                <SelectItem value="collectionCodeId">Collection</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {field && (
            <div className="space-y-2">
              <Label>New Value</Label>
              {renderInput()}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || !field}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Items
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
