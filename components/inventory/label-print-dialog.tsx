"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, Loader2 } from "lucide-react";
import { generateLabelPDF, LabelConfig, DEFAULT_TAG_CONFIG, DEFAULT_A4_CONFIG, LabelItem, DEFAULT_FIELDS } from "@/lib/label-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createLabelJob } from "@/app/(dashboard)/labels/actions";
import { encodePrice } from "@/lib/price-encoder";

const AVAILABLE_FIELDS_UI = [
    { id: "itemName", label: "Item Name" },
    { id: "internalName", label: "Internal Name" },
    { id: "sku", label: "SKU" },
    { id: "qrCode", label: "QR Code" },
    { id: "gemType", label: "Gem Type" },
    { id: "color", label: "Color" },
    { id: "shape", label: "Shape" },
    { id: "dimensions", label: "Dimensions" },
    { id: "weight", label: "Weight" },
    { id: "stockLocation", label: "Stock Location" },
    { id: "price", label: "Price" },
    { id: "companyName", label: "Company Footer" }
];

interface LabelPrintDialogProps {
    item?: LabelItem;
    items?: LabelItem[];
    trigger?: React.ReactNode;
    onPrintComplete?: () => void;
}

export function LabelPrintDialog({ item, items, trigger, onPrintComplete }: LabelPrintDialogProps) {
    const [open, setOpen] = useState(false);
    
    // Initialize config from localStorage if available
    const [config, setConfig] = useState<LabelConfig>(DEFAULT_TAG_CONFIG);
    const [isLoaded, setIsLoaded] = useState(false);
    const [presetName, setPresetName] = useState("");
    const [presets, setPresets] = useState<{ name: string; config: LabelConfig }[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem("label-print-config");
        const savedPresets = localStorage.getItem("label-print-presets");
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved config", e);
            }
        }
        if (savedPresets) {
            try {
                setPresets(JSON.parse(savedPresets));
            } catch (e) {
                console.error("Failed to parse saved presets", e);
            }
        }
        setIsLoaded(true);
    }, []);

    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem("label-print-config", JSON.stringify(config));
        }
    }, [config, isLoaded]);

    const [isPrinting, setIsPrinting] = useState(false);
    const [activeTab, setActiveTab] = useState("preview");

    const targets = items && items.length > 0 ? items : (item ? [item] : []);

    const handleFormatChange = (format: "TAG" | "A4") => {
        const defaults = format === "TAG" ? DEFAULT_TAG_CONFIG : DEFAULT_A4_CONFIG;
        setConfig({ 
            ...defaults, 
            showPrice: config.showPrice,
            selectedFields: config.selectedFields || DEFAULT_FIELDS // Preserve selection or use default
        });
    };

    const handleToggleField = (fieldId: string) => {
        const current = config.selectedFields || DEFAULT_FIELDS;
        const updated = current.includes(fieldId)
            ? current.filter(f => f !== fieldId)
            : [...current, fieldId];
        setConfig({ ...config, selectedFields: updated });
    };

    const handleSelectAll = (select: boolean) => {
        if (select) {
            setConfig({ ...config, selectedFields: AVAILABLE_FIELDS_UI.map(f => f.id) });
        } else {
            setConfig({ ...config, selectedFields: [] });
        }
    };
    
    const savePreset = () => {
        if (!presetName.trim()) return;
        const updated = presets.filter(p => p.name !== presetName.trim());
        updated.push({ name: presetName.trim(), config });
        setPresets(updated);
        localStorage.setItem("label-print-presets", JSON.stringify(updated));
    };
    
    const loadPreset = (name: string) => {
        const found = presets.find(p => p.name === name);
        if (found) {
            setConfig(found.config);
        }
    };
    
    const deletePreset = (name: string) => {
        const updated = presets.filter(p => p.name !== name);
        setPresets(updated);
        localStorage.setItem("label-print-presets", JSON.stringify(updated));
    };
    
    const setEpsonL3250 = () => {
        // Tuned for Epson L3250 (EcoTank) - A4
        // A4 Width: 210mm. 
        // 6 Cols: ~32mm width + gaps
        setConfig({ 
            ...DEFAULT_A4_CONFIG, 
            cols: 6, 
            rows: 12, 
            marginTop: 5, 
            marginLeft: 4,
            horizontalGap: 2,
            verticalGap: 1,
            labelWidth: 32,
            labelHeight: 20,
            fontSize: 7,
            qrSize: 6,
            showPrice: config.showPrice,
            selectedFields: config.selectedFields || DEFAULT_FIELDS
        });
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 1. Create Job & Get Checksums (Server-Side)
            const inventoryIds = targets.map(t => t.id);
            const res = await createLabelJob({
                inventoryIds,
                printFormat: config
            });

            if (!res.success || !res.items) {
                console.error("Print Job Creation Failed:", res);
                throw new Error(res.message || "Failed to create print job");
            }

            // 2. Generate PDF with returned items (containing checksums)
            // Map res.items to LabelItem interface
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const finalItems: LabelItem[] = res.items.map((i: any) => ({
                id: i.inventoryId || i.id, // Handle backend returning inventoryId
                sku: i.sku,
                itemName: i.itemName,
                internalName: i.internalName,
                gemType: i.gemType,
                color: i.color,
                weightValue: i.weightValue,
                weightUnit: i.weightUnit,
                weightRatti: i.weightRatti,
                shape: i.shape,
                dimensions: i.dimensions,
                stockLocation: i.stockLocation,
                sellingPrice: i.sellingPrice,
                pricingMode: i.pricingMode,
                sellingRatePerCarat: i.sellingRatePerCarat,
                priceWithChecksum: i.priceWithChecksum
            }));

            const pdfUrl = await generateLabelPDF(finalItems, config);
            
            // Open PDF
            const win = window.open(pdfUrl, "_blank");
            if (!win) {
                toast.error("Please allow popups to print labels");
            } else {
                toast.success("Labels generated successfully");
            }
            
            if (onPrintComplete) {
                onPrintComplete();
            }
        } catch (error: unknown) {
            console.error("Print failed", error);
            const msg = error instanceof Error ? error.message : "Failed to generate labels";
            toast.error(msg);
        } finally {
            setIsPrinting(false);
        }
    };

    // Calculate preview price
    const getPreviewPrice = (target: LabelItem) => {
        const fields = config.selectedFields || DEFAULT_FIELDS;
        if (!fields.includes("price")) return null;

        // 1. Calculate Total Price (Same as server)
        let totalPrice = 0;
        if (target.pricingMode === "PER_CARAT" && target.sellingRatePerCarat && target.weightValue) {
            totalPrice = target.sellingRatePerCarat * target.weightValue;
        } else {
            totalPrice = target.sellingPrice || 0;
        }

        // 2. Encode
        const encoded = encodePrice(totalPrice);
        let display = `R ${encoded.priceWithChecksum}`; // Default: Show Checksum Price

        // 3. Append Per Carat Rate if applicable (User request)
        if (target.pricingMode === "PER_CARAT" && target.sellingRatePerCarat) {
            display += ` (${target.sellingRatePerCarat.toLocaleString()}/ct)`;
        } else if (target.pricingMode === "FLAT") {
            display += ` (Flat)`;
        }

        return display;
    };
    
    const previewPriceText = targets[0] ? getPreviewPrice(targets[0]) : "";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline" size="sm"><Printer className="mr-2 h-4 w-4" /> Print Label</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Print Labels ({targets.length})</DialogTitle>
                    <DialogDescription>
                        Configure print settings and preview labels.
                    </DialogDescription>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview">Preview & Print</TabsTrigger>
                        <TabsTrigger value="settings">Layout Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="space-y-4 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Label Format</Label>
                                    <Select 
                                        value={config.pageSize} 
                                        onValueChange={(v: "TAG" | "A4") => handleFormatChange(v)}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TAG">Single Tag (Thermal)</SelectItem>
                                            <SelectItem value="A4">A4 Sheet (Grid)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="space-y-3 border rounded p-4 bg-muted/10">
                                <div className="flex items-center justify-between">
                                    <Label className="font-semibold">Label Content</Label>
                                    <div className="flex gap-2 text-xs">
                                        <button onClick={() => handleSelectAll(true)} className="text-primary hover:underline">Select All</button>
                                        <span className="text-muted-foreground">|</span>
                                        <button onClick={() => handleSelectAll(false)} className="text-primary hover:underline">Deselect All</button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {AVAILABLE_FIELDS_UI.map(field => (
                                         <div key={field.id} className="flex items-center space-x-2">
                                             <Checkbox 
                                                 id={`field-${field.id}`}
                                                 checked={(config.selectedFields || DEFAULT_FIELDS).includes(field.id)}
                                                 onCheckedChange={() => handleToggleField(field.id)}
                                             />
                                             <Label htmlFor={`field-${field.id}`} className="cursor-pointer">{field.label}</Label>
                                         </div>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="border rounded-md p-8 bg-muted/20 flex justify-center items-center min-h-[200px]">
                                <div 
                                    className="bg-white border border-gray-300 shadow-sm relative overflow-hidden"
                                    style={{ 
                                        width: `${config.labelWidth}mm`, 
                                        height: `${config.labelHeight}mm`,
                                        padding: "2mm",
                                        transform: "scale(1.5)", // Zoom for visibility
                                        transformOrigin: "center"
                                    }}
                                >
                                    {/* Dynamic CSS Preview matching PDF Logic */}
                                    {targets[0] && (
                                        <div className="h-full flex flex-col relative text-black leading-tight">
                                            {(config.selectedFields || DEFAULT_FIELDS).includes("qrCode") && (
                                                <div className="absolute top-0 right-0 bg-gray-100 flex items-center justify-center text-[6px]" 
                                                    style={{ width: `${config.qrSize}mm`, height: `${config.qrSize}mm` }}>QR</div>
                                            )}
                                            
                                            <div className="flex-1">
                                                {(config.selectedFields || DEFAULT_FIELDS).includes("itemName") && (
                                                    <div 
                                                        className="font-bold mb-0.5 leading-none" 
                                                        style={{ 
                                                            fontSize: `${targets[0].itemName.length > 25 ? config.fontSize : config.fontSize + 2}pt`,
                                                            paddingRight: (config.selectedFields || DEFAULT_FIELDS).includes("qrCode") ? `${config.qrSize + 2}mm` : '0',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {targets[0].itemName}
                                                    </div>
                                                )}

                                                {(config.selectedFields || DEFAULT_FIELDS).includes("internalName") && targets[0].internalName && (
                                                    <div 
                                                        className="font-bold mb-0.5 leading-none text-gray-700"
                                                        style={{ fontSize: `${config.fontSize - 1}pt` }}
                                                    >
                                                        {targets[0].internalName}
                                                    </div>
                                                )}

                                                {(config.selectedFields || DEFAULT_FIELDS).includes("sku") && (
                                                    <div className="font-mono mb-1" style={{ fontSize: `${config.fontSize}pt` }}>
                                                        {targets[0].sku}
                                                    </div>
                                                )}
                                                
                                                <div className="space-y-0.5" style={{ fontSize: `${config.fontSize - 1}pt` }}>
                                                    {((config.selectedFields || DEFAULT_FIELDS).includes("gemType") || (config.selectedFields || DEFAULT_FIELDS).includes("color")) && (
                                                        <div>
                                                            {[
                                                                (config.selectedFields || DEFAULT_FIELDS).includes("gemType") ? targets[0].gemType : null,
                                                                (config.selectedFields || DEFAULT_FIELDS).includes("color") ? targets[0].color : null
                                                            ].filter(Boolean).join(" • ")}
                                                        </div>
                                                    )}

                                                    {((config.selectedFields || DEFAULT_FIELDS).includes("shape") || (config.selectedFields || DEFAULT_FIELDS).includes("dimensions")) && (
                                                        <div>
                                                            {[
                                                                (config.selectedFields || DEFAULT_FIELDS).includes("shape") ? targets[0].shape : null,
                                                                (config.selectedFields || DEFAULT_FIELDS).includes("dimensions") ? targets[0].dimensions : null
                                                            ].filter(Boolean).join(" • ")}
                                                        </div>
                                                    )}

                                                    {(config.selectedFields || DEFAULT_FIELDS).includes("weight") && (
                                                        <div>
                                                            {targets[0].weightValue} {targets[0].weightUnit}
                                                            {targets[0].weightRatti ? ` (${targets[0].weightRatti.toFixed(2)} R)` : ''}
                                                        </div>
                                                    )}

                                                    {(config.selectedFields || DEFAULT_FIELDS).includes("stockLocation") && targets[0].stockLocation && (
                                                        <div className="font-mono text-xs">
                                                            Loc: {targets[0].stockLocation}
                                                        </div>
                                                    )}

                                                    {(config.selectedFields || DEFAULT_FIELDS).includes("price") && previewPriceText && (
                                                        <div className="font-bold mt-0.5">{previewPriceText.replace("Rs.", "R")}</div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {(config.selectedFields || DEFAULT_FIELDS).includes("companyName") && (
                                                <div className="absolute bottom-0 w-full text-center text-gray-400" 
                                                    style={{ fontSize: `4pt` }}>
                                                    KhyatiGems™
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Preview is approximate. Actual print depends on printer settings.
                            </p>
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handlePrint} disabled={isPrinting}>
                                {isPrinting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isPrinting ? "Generating..." : "Print Labels"}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Rows</Label>
                                <Input type="number" value={config.rows} onChange={(e) => setConfig({...config, rows: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Columns</Label>
                                <Input type="number" value={config.cols} onChange={(e) => setConfig({...config, cols: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Top Margin (mm)</Label>
                                <Input type="number" value={config.marginTop} onChange={(e) => setConfig({...config, marginTop: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Left Margin (mm)</Label>
                                <Input type="number" value={config.marginLeft} onChange={(e) => setConfig({...config, marginLeft: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>H-Gap (mm)</Label>
                                <Input type="number" value={config.horizontalGap} onChange={(e) => setConfig({...config, horizontalGap: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>V-Gap (mm)</Label>
                                <Input type="number" value={config.verticalGap} onChange={(e) => setConfig({...config, verticalGap: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Label Width (mm)</Label>
                                <Input type="number" value={config.labelWidth} onChange={(e) => setConfig({...config, labelWidth: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Label Height (mm)</Label>
                                <Input type="number" value={config.labelHeight} onChange={(e) => setConfig({...config, labelHeight: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>QR Size (mm)</Label>
                                <Input type="number" value={config.qrSize} onChange={(e) => setConfig({...config, qrSize: Number(e.target.value)})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Font Size (pt)</Label>
                                <Input type="number" value={config.fontSize} onChange={(e) => setConfig({...config, fontSize: Number(e.target.value)})} />
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Preset Name</Label>
                                <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g., A4 6-per-row" />
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={savePreset}>Save Preset</Button>
                                    <Button variant="secondary" onClick={setEpsonL3250}>Epson L3250 Preset</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Saved Presets</Label>
                                <Select onValueChange={(v) => loadPreset(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {presets.map(p => (
                                            <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="flex gap-2">
                                    <Button 
                                        variant="destructive" 
                                        disabled={!presetName} 
                                        onClick={() => deletePreset(presetName)}
                                    >
                                        Delete Preset
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
