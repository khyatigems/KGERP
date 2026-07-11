"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, Pencil } from "lucide-react";
import { bulkUpdateInventory } from "@/app/(dashboard)/inventory/actions";
import { Badge } from "@/components/ui/badge";

type InventoryItem = {
  id: string;
  sku: string;
  itemName: string;
  category: string | null;
  gemType: string | null;
  color: string | null;
  shape: string | null;
  cutCodeId: string | null;
  origin: string | null;
  fluorescence: string | null;
  treatment: string | null;
  transparency: string | null;
  categoryCodeId: string | null;
  gemstoneCodeId: string | null;
  colorCodeId: string | null;
  vendorId: string | null;
  collectionCodeId: string | null;
  stockLocation: string | null;
  status: string;
  categoryCode: { id: string; name: string } | null;
  gemstoneCode: { id: string; name: string } | null;
  colorCode: { id: string; name: string } | null;
  cutCode: { id: string; name: string } | null;
};

type MasterData = {
  categories: { id: string; name: string }[];
  gemstones: { id: string; name: string }[];
  colors: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  collections: { id: string; name: string }[];
  rashis: { id: string; name: string }[];
  certificates: { id: string; name: string }[];
  cuts: { id: string; name: string }[];
};

interface FieldConfig {
  id: string;
  label: string;
  type: "select" | "text";
  options?: { value: string; label: string }[];
}

const FIELD_CONFIGS: FieldConfig[] = [
  { id: "stockLocation", label: "Location", type: "text" },
  { id: "status", label: "Status", type: "select", options: [{ value: "IN_STOCK", label: "In Stock" }, { value: "SOLD", label: "Sold" }, { value: "MEMO", label: "Memo" }, { value: "RESERVED", label: "Reserved" }] },
  { id: "categoryCodeId", label: "Category", type: "select" },
  { id: "gemstoneCodeId", label: "Gemstone Type", type: "select" },
  { id: "colorCodeId", label: "Color", type: "select" },
  { id: "vendorId", label: "Vendor", type: "select" },
  { id: "collectionCodeId", label: "Collection", type: "select" },
  { id: "cutCodeId", label: "Cut", type: "select" },
  { id: "shape", label: "Shape", type: "select", options: ["Round", "Oval", "Cushion", "Emerald", "Pear", "Marquise", "Heart", "Other"].map(s => ({ value: s, label: s })) },
  { id: "fluorescence", label: "Fluorescence", type: "select", options: ["None", "Faint", "Medium", "Strong", "Very Strong", "Not Applicable"].map(f => ({ value: f, label: f })) },
  { id: "treatment", label: "Treatment", type: "select", options: ["None", "Untreated", "Heat", "Oil", "Resin", "Irradiation", "Diffusion", "Glass-Filled"].map(t => ({ value: t, label: t })) },
  { id: "transparency", label: "Transparency", type: "select", options: ["Transparent", "Translucent", "Opaque", "Semi-Transparent", "Semi-Translucent"].map(t => ({ value: t, label: t })) },
];

function getOptions(config: FieldConfig, masterData: MasterData, origins: string[]): { value: string; label: string }[] {
  if (config.options) return config.options;
  switch (config.id) {
    case "categoryCodeId": return masterData.categories.map(c => ({ value: c.id, label: c.name }));
    case "gemstoneCodeId": return masterData.gemstones.map(g => ({ value: g.id, label: g.name }));
    case "colorCodeId": return masterData.colors.map(c => ({ value: c.id, label: c.name }));
    case "vendorId": return masterData.vendors.map(v => ({ value: v.id, label: v.name }));
    case "collectionCodeId": return masterData.collections.map(c => ({ value: c.id, label: c.name }));
    case "cutCodeId": return masterData.cuts.map(c => ({ value: c.id, label: c.name }));
    case "origin": return [...new Set(["Burma (Myanmar)", "Sri Lanka (Ceylon)", "Kashmir", "Madagascar", "Mozambique", "Thailand", "Colombia", "Zambia", ...origins])]
      .map(o => ({ value: o, label: o }));
    default: return [];
  }
}

export function BulkEditManager({
  items,
  masterData,
  origins = [],
}: {
  items: InventoryItem[];
  masterData: MasterData;
  origins?: string[];
}) {
  const router = useRouter();
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string | null>>({});
  const [isoloading, setIsLoading] = useState(false);

  const toggleField = (fieldId: string) => {
    if (selectedFields.includes(fieldId)) {
      setSelectedFields(selectedFields.filter(f => f !== fieldId));
      const v = { ...fieldValues };
      delete v[fieldId];
      setFieldValues(v);
    } else {
      setSelectedFields([...selectedFields, fieldId]);
    }
  };

  const setFieldValue = (fieldId: string, value: string) => {
    setFieldValues({ ...fieldValues, [fieldId]: value || null });
  };

  const getCurrentValue = (item: InventoryItem, fieldId: string): string => {
    switch (fieldId) {
      case "stockLocation": return item.stockLocation ?? "";
      case "status": return item.status;
      case "categoryCodeId": return item.categoryCode?.name ?? "";
      case "gemstoneCodeId": return item.gemstoneCode?.name ?? "";
      case "colorCodeId": return item.colorCode?.name ?? "";
      case "vendorId": return item.vendorId ?? "";
      case "collectionCodeId": return item.collectionCodeId ?? "";
      case "cutCodeId": return item.cutCode?.name ?? "";
      case "origin": return item.origin ?? "";
      case "shape": return item.shape ?? "";
      case "fluorescence": return item.fluorescence ?? "";
      case "treatment": return item.treatment ?? "";
      case "transparency": return item.transparency ?? "";
      default: return "";
    }
  };

  const getNewValue = (fieldId: string): string => {
    const v = fieldValues[fieldId];
    if (v === null || v === undefined) return "";
    return v;
  };

  const fieldConfigsWithOptions = FIELD_CONFIGS.map(config => ({
    ...config,
    options: getOptions(config, masterData, origins),
  }));

  const handleSave = useCallback(async () => {
    if (selectedFields.length === 0) {
      toast.error("Select at least one field to update");
      return;
    }
    const updates: Record<string, unknown> = {};
    for (const fieldId of selectedFields) {
      const val = fieldValues[fieldId];
      if (val !== null && val !== undefined) {
        updates[fieldId] = val;
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.error("No changes to apply");
      return;
    }

    setIsLoading(true);
    try {
      const result = await bulkUpdateInventory(items.map(i => i.id), updates);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`${items.length} items updated`);
        router.replace("/inventory");
      }
    } catch {
      toast.error("Failed to update items");
    } finally {
      setIsLoading(false);
    }
  }, [selectedFields, fieldValues, items]);

  return (
    <div className="space-y-6 sass-enter">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bulk Edit</h1>
            <p className="text-sm text-muted-foreground">{items.length} items selected</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isoloading || selectedFields.length === 0} className="gap-2">
          {isoloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Apply Changes
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Pencil className="h-4 w-4" />
            Fields to Update
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="flex flex-wrap gap-2">
            {fieldConfigsWithOptions.map((config) => (
              <div
                key={config.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-all ${
                  selectedFields.includes(config.id)
                    ? "bg-primary/10 border-primary text-primary"
                    : "border-muted-foreground/20 text-muted-foreground hover:border-muted-foreground/40"
                }`}
                onClick={() => toggleField(config.id)}
              >
                <Checkbox
                  checked={selectedFields.includes(config.id)}
                  onCheckedChange={() => toggleField(config.id)}
                  className="pointer-events-none"
                />
                {config.label}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedFields.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Set Values</CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedFields.map((fieldId) => {
                const config = fieldConfigsWithOptions.find(c => c.id === fieldId);
                if (!config) return null;
                return (
                  <div key={fieldId} className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">{config.label}</Label>
                    {config.type === "select" ? (
                      <Select value={fieldValues[fieldId] ?? ""} onValueChange={(v) => setFieldValue(fieldId, v)}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={`Select ${config.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(config.options ?? []).map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-9"
                        placeholder={`New ${config.label}`}
                        value={fieldValues[fieldId] ?? ""}
                        onChange={(e) => setFieldValue(fieldId, e.target.value)}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Selected Items Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">SKU</TableHead>
                  <TableHead>Item Name</TableHead>
                  {selectedFields.map((fieldId) => {
                    const config = fieldConfigsWithOptions.find(c => c.id === fieldId);
                    return <TableHead key={fieldId}>{config?.label ?? fieldId}</TableHead>;
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id} className="sass-enter" style={{ animationDelay: `${idx * 0.04}s` }}>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    {selectedFields.map((fieldId) => {
                      const currentVal = getCurrentValue(item, fieldId);
                      const newVal = getNewValue(fieldId);
                      const willChange = newVal !== "" && newVal !== currentVal;
                      return (
                        <TableCell key={fieldId}>
                          {willChange ? (
                            <div className="flex items-center gap-2">
                              <span className="line-through text-muted-foreground text-xs">{currentVal || "-"}</span>
                              <span className="text-xs">→</span>
                              <Badge variant="secondary" className="text-xs">{newVal}</Badge>
                            </div>
                          ) : (
                            <span className="text-sm">{currentVal || "-"}</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
