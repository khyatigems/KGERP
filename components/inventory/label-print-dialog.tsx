"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { generateLabelPDF, LabelConfig, DEFAULT_TAG_CONFIG, DEFAULT_A4_CONFIG, DEFAULT_THERMAL_CONFIG, LabelItem, DEFAULT_FIELDS } from "@/lib/label-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createLabelJob } from "@/app/(dashboard)/labels/actions";
import { signOut } from "next-auth/react";
import JsBarcode from "jsbarcode";
import { getCompanySettings } from "@/app/(dashboard)/settings/company/actions";

const AVAILABLE_FIELDS_UI = [
    { id: "itemName", label: "Item Name" },
    { id: "internalName", label: "Internal Name" },
    { id: "sku", label: "SKU" },
    { id: "qrCode", label: "QR Code" },
    { id: "gemType", label: "Gem Type" },
    { id: "color", label: "Color" },
    { id: "shape", label: "Shape" },
    { id: "weight", label: "Weight" },
    { id: "stockLocation", label: "Stock Location" },
    { id: "price", label: "Price" },
    { id: "companyLogo", label: "Company Logo" }
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
    const [companyLogoData, setCompanyLogoData] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (open) {
            getCompanySettings().then(async (res) => {
                if (res.success && res.data?.logoUrl) {
                    // Fetch image and convert to Base64
                    try {
                        const response = await fetch(res.data.logoUrl);
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setCompanyLogoData(reader.result as string);
                        };
                        reader.readAsDataURL(blob);
                    } catch (e) {
                        console.error("Failed to load company logo", e);
                    }
                }
            });
        }
    }, [open]);

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

    const targets = useMemo(() => items && items.length > 0 ? items : (item ? [item] : []), [items, item]);
    const barcodeRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (config.pageSize === "THERMAL" && targets[0] && barcodeRef.current && open) {
            try {
                JsBarcode(barcodeRef.current, targets[0].sku, {
                    format: "CODE128",
                    width: 2,
                    height: 30,
                    displayValue: false,
                    margin: 0,
                    background: "transparent"
                });
            } catch (e) {
                console.error("Barcode preview error", e);
            }
        }
    }, [config.pageSize, targets, open, activeTab]);

    const handleFormatChange = (format: "TAG" | "A4" | "THERMAL") => {
        let defaults: LabelConfig;
        if (format === "TAG") defaults = DEFAULT_TAG_CONFIG;
        else if (format === "THERMAL") defaults = DEFAULT_THERMAL_CONFIG;
        else defaults = DEFAULT_A4_CONFIG;
        
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

    const setThermalRollPreset = () => {
        setConfig({
            ...DEFAULT_THERMAL_CONFIG,
            labelWidth: 50,
            labelHeight: 27.5,
            marginTop: 0,
            marginLeft: 0,
            horizontalGap: 0,
            verticalGap: 0,
            qrSize: 10,
            fontSize: 8,
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

            if (!res || !res.success || !res.items) {
                console.error("Print Job Creation Failed:", res);
                throw new Error(res?.message || "Failed to create print job. Please check if you are logged in.");
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

            const pdfUrl = await generateLabelPDF(finalItems, { ...config, companyLogo: companyLogoData });
            
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
            
            if (msg.includes("Session invalid")) {
                toast.error("Session expired. Redirecting to login...");
                setTimeout(() => {
                    signOut({ callbackUrl: "/login" });
                }, 1500);
            } else {
                toast.error(msg);
            }
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Print Labels</DialogTitle>
                    <DialogDescription>
                        Configure layout and content for printing labels.
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
                                        onValueChange={(v: "TAG" | "A4" | "THERMAL") => handleFormatChange(v)}
                                    >
                                        <SelectTrigger className="w-[200px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TAG">Tag (40x25)</SelectItem>
                                            <SelectItem value="THERMAL">Thermal (50x25)</SelectItem>
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
                                        padding: config.pageSize === "THERMAL" ? "1.5mm" : "2mm",
                                        transform: "scale(1.5)", // Zoom for visibility
                                        transformOrigin: "center"
                                    }}
                                >
                                    {/* Preview Content */}
                                    {targets[0] && (
                                        config.pageSize === "THERMAL" ? (
                                            /* Thermal Layout Preview */
                                            <div className="h-full relative text-black leading-tight font-sans">
                                                {/* QR Code (Top Right) */}
                                                {(config.selectedFields || DEFAULT_FIELDS).includes("qrCode") && (
                                                    <div className="absolute top-0 right-0 bg-gray-100 flex items-center justify-center text-[6px]" 
                                                        style={{ width: `12mm`, height: `12mm` }}>QR</div>
                                                )}
                                                
                                                {/* Content (Top Left) */}
                                                <div className="flex flex-col gap-[2px]" style={{ width: 'calc(100% - 13mm)' }}>
                                                    {/* Item Name */}
                                                    <div className="font-bold text-[9px] truncate leading-none">
                                                        {targets[0].itemName}
                                                    </div>
                                                    
                                                    {/* SKU */}
                                                    <div className="font-mono font-bold text-[7px] leading-none">
                                                        {targets[0].sku}
                                                    </div>

                                                    {/* Gem & Color */}
                                                    <div className="text-[7px] leading-none">
                                                        {[targets[0].gemType, targets[0].color].filter(Boolean).join(" • ")}
                                                    </div>

                                                    {/* Weight & Shape */}
                                                    <div className="text-[7px] leading-none">
                                                        {`${targets[0].weightValue} ${targets[0].weightUnit}${targets[0].weightRatti ? ` (${targets[0].weightRatti.toFixed(2)} Ratti)` : ''} • ${targets[0].shape || ''}`}
                                                    </div>

                                                    {/* Price */}
                                                    {(config.selectedFields || DEFAULT_FIELDS).includes("price") && (
                                                        <div className="font-bold text-[9px] leading-none">
                                                            {(() => {
                                                                let p = `R ${targets[0].priceWithChecksum || targets[0].sellingPrice}`;
                                                                if (targets[0].pricingMode === "PER_CARAT" && targets[0].sellingRatePerCarat) {
                                                                    p += ` (${Math.round(targets[0].sellingRatePerCarat).toLocaleString()}/ct)`;
                                                                }
                                                                return p;
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Barcode (Bottom) */}
                                                <div className="absolute bottom-0 left-0 w-full flex justify-center items-end" style={{ height: '6mm' }}>
                                                    <canvas ref={barcodeRef} style={{ width: '35mm', height: '100%', maxWidth: '100%' }} />
                                                </div>
                                            </div>
                                        ) : (
                                            /* Grid Layout Preview */
                                            <div 
                                                className="grid gap-2 p-4 bg-white shadow-sm overflow-auto max-h-[400px]"
                                                style={{
                                                    gridTemplateColumns: `repeat(${config.cols}, 1fr)`
                                                }}
                                            >
                                                {Array.from({ length: config.rows * config.cols }).map((_, i) => (
                                                    <div 
                                                        key={i}
                                                        className="border border-gray-200 flex items-center justify-center text-[10px] text-muted-foreground bg-gray-50"
                                                        style={{
                                                            width: `${config.labelWidth}mm`,
                                                            height: `${config.labelHeight}mm`
                                                        }}
                                                    >
                                                        {targets[i] ? targets[i].sku : "Label"}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
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
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="outline" onClick={savePreset}>Save Preset</Button>
                                    <Button variant="secondary" onClick={setEpsonL3250}>Epson L3250 Preset</Button>
                                    <Button variant="secondary" onClick={setThermalRollPreset}>Thermal Roll 50x25+Gap</Button>
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
