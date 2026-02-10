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
  categories: { id: string; name: string }[];
  gemstones: { id: string; name: string }[];
  colors: { id: string; name: string }[];
  rashis: { id: string; name: string }[];
  certificates: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  collections: { id: string; name: string }[];
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
  const [updates, setUpdates] = useState<Record<string, unknown>>({});
  const [enabledFields, setEnabledFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const toggleField = (field: string) => {
    if (enabledFields.includes(field)) {
      setEnabledFields(enabledFields.filter((f) => f !== field));
      const newUpdates = { ...updates };
      delete newUpdates[field];
      setUpdates(newUpdates);
    } else {
      setEnabledFields([...enabledFields, field]);
    }
  };

  const updateValue = (field: string, value: unknown) => {
    setUpdates({ ...updates, [field]: value });
  };

  const handleSave = async () => {
    if (Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    setIsLoading(true);
    try {
      const result = await bulkUpdateInventory(selectedIds, updates);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Items updated successfully");
        onSuccess();
        onOpenChange(false);
        setUpdates({});
        setEnabledFields([]);
      }
    } catch {
      toast.error("Failed to update items");
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { id: "stockLocation", label: "Location", type: "text" },
    { id: "status", label: "Status", type: "select" },
    { id: "categoryCodeId", label: "Category", type: "select" },
    { id: "gemstoneCodeId", label: "Gemstone Type", type: "select" },
    { id: "colorCodeId", label: "Color", type: "select" },
    { id: "vendorId", label: "Vendor", type: "select" },
    { id: "collectionCodeId", label: "Collection", type: "select" },
    { id: "rashiIds", label: "Rashi", type: "multi" },
    { id: "certificateIds", label: "Certificates", type: "multi" },
  ];

  const renderInput = (fieldId: string) => {
    const value = updates[fieldId];
    
    switch (fieldId) {
      case "stockLocation":
        return (
          <Input 
            value={(value as string) || ""} 
            onChange={(e) => updateValue(fieldId, e.target.value)} 
            placeholder="Enter location" 
            className="h-9"
          />
        );
      case "status":
        return (
          <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select status" /></SelectTrigger>
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
          <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select Category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "gemstoneCodeId":
        return (
           <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select Gemstone" /></SelectTrigger>
            <SelectContent>
              {gemstones.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "colorCodeId":
        return (
           <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select Color" /></SelectTrigger>
            <SelectContent>
              {colors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "vendorId":
        return (
           <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
            <SelectContent>
              {vendors.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "collectionCodeId":
        return (
           <Select onValueChange={(v) => updateValue(fieldId, v)} value={(value as string) || ""}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Select Collection" /></SelectTrigger>
            <SelectContent>
              {collections.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "rashiIds":
        return (
           <ScrollArea className="h-[150px] border rounded-md p-2 w-full">
             <div className="space-y-2">
               {rashis.map((r) => (
                 <div key={r.id} className="flex items-center space-x-2">
                   <Checkbox 
                     id={`rashi-${r.id}`} 
                     checked={(value as string[] || []).includes(r.id)}
                     onCheckedChange={(checked) => {
                       const current = (value as string[]) || [];
                       if (checked) updateValue(fieldId, [...current, r.id]);
                       else updateValue(fieldId, current.filter(id => id !== r.id));
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
           <ScrollArea className="h-[150px] border rounded-md p-2 w-full">
             <div className="space-y-2">
               {certificates.map((c) => (
                 <div key={c.id} className="flex items-center space-x-2">
                   <Checkbox 
                     id={`cert-${c.id}`} 
                     checked={(value as string[] || []).includes(c.id)}
                     onCheckedChange={(checked) => {
                       const current = (value as string[]) || [];
                       if (checked) updateValue(fieldId, [...current, c.id]);
                       else updateValue(fieldId, current.filter(id => id !== c.id));
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Bulk Edit {selectedIds.length} Items</DialogTitle>
          <DialogDescription>Select fields to update and provide new values.</DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-4 py-4 px-1">
            {fields.map((field) => (
              <div key={field.id} className={`p-4 rounded-lg border transition-all ${enabledFields.includes(field.id) ? 'bg-muted/30 border-primary/50 shadow-sm' : 'border-transparent hover:bg-muted/20'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id={`enable-${field.id}`}
                    checked={enabledFields.includes(field.id)}
                    onCheckedChange={() => toggleField(field.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <Label 
                      htmlFor={`enable-${field.id}`} 
                      className={`cursor-pointer font-medium ${enabledFields.includes(field.id) ? 'text-primary' : ''}`}
                    >
                      Update {field.label}
                    </Label>
                    
                    {enabledFields.includes(field.id) && (
                      <div className="pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {renderInput(field.id)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isLoading || enabledFields.length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update {enabledFields.length} Fields
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
