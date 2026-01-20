"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Printer, Loader2 } from "lucide-react";
import { generateLabelPDF, LabelConfig, DEFAULT_TAG_CONFIG, DEFAULT_A4_CONFIG, LabelItem } from "@/lib/label-generator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createLabelJob } from "@/app/(dashboard)/labels/actions";
import { encodePrice } from "@/lib/price-encoder";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LabelPrintDialogProps {
    item?: LabelItem;
    items?: LabelItem[];
    trigger?: React.ReactNode;
}

export function LabelPrintDialog({ item, items, trigger }: LabelPrintDialogProps) {
    const [open, setOpen] = useState(false);
    
    // Initialize config from localStorage if available
    const [config, setConfig] = useState<LabelConfig>(DEFAULT_TAG_CONFIG);
    const [pricingMode, setPricingMode] = useState<"FLAT" | "PER_CARAT">("FLAT");
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("label-print-config");
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to parse saved config", e);
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
        if (format === "TAG") setConfig({ ...DEFAULT_TAG_CONFIG, showPrice: config.showPrice });
        else setConfig({ ...DEFAULT_A4_CONFIG, showPrice: config.showPrice });
    };

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            // 1. Create Job & Get Checksums (Server-Side)
            const inventoryIds = targets.map(t => t.id);
            const res = await createLabelJob({
                inventoryIds,
                pricingMode,
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
                id: i.id,
                sku: i.sku,
                itemName: i.itemName,
                gemType: i.gemType,
                color: i.color,
                weightValue: i.weightValue,
                weightUnit: i.weightUnit,
                weightRatti: i.weightRatti,
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
            }
        } catch (error) {
            console.error("Print failed", error);
            toast.error("Failed to generate labels");
        } finally {
            setIsPrinting(false);
        }
    };

    // Calculate preview price
    const getPreviewPrice = (target: LabelItem) => {
        let price = 0;
        if (pricingMode === "PER_CARAT") {
            price = target.sellingRatePerCarat || 0;
        } else {
            price = target.sellingPrice || 0; // Assuming sellingPrice passed in is Flat or Total
        }
        
        if (config.showEncodedPrice) {
            const encoded = encodePrice(price);
            return `Rs. ${encoded.priceWithChecksum}`;
        } else if (config.showPrice) {
            return pricingMode === "PER_CARAT" 
                ? `Rs. ${price.toLocaleString()}/ct`
                : `Rs. ${price.toLocaleString()}`;
        }
        return null;
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
                            
                            <div className="flex flex-wrap gap-4 p-4 border rounded bg-muted/10">
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="show-price" 
                                        checked={config.showPrice} 
                                        onCheckedChange={(c) => setConfig({ ...config, showPrice: !!c })} 
                                    />
                                    <Label htmlFor="show-price">Include Price</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Checkbox 
                                        id="show-encoded" 
                                        checked={config.showEncodedPrice} 
                                        onCheckedChange={(c) => setConfig({ ...config, showEncodedPrice: !!c })} 
                                    />
                                    <Label htmlFor="show-encoded">Append Checksum</Label>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Pricing Mode</Label>
                                <RadioGroup value={pricingMode} onValueChange={(v: "FLAT" | "PER_CARAT") => setPricingMode(v)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="FLAT" id="mode-flat" />
                                        <Label htmlFor="mode-flat">Flat Rate (Price/Piece)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="PER_CARAT" id="mode-carat" />
                                        <Label htmlFor="mode-carat">Carat Mode (Price/Carat)</Label>
                                    </div>
                                </RadioGroup>
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
                                    {/* Simplified CSS Preview matching PDF Logic */}
                                    {targets[0] && (
                                        <div className="h-full flex flex-col relative text-black">
                                            <div className="absolute top-0 right-0 bg-gray-100 flex items-center justify-center text-[6px]" 
                                                style={{ width: `${config.qrSize}mm`, height: `${config.qrSize}mm` }}>QR</div>
                                            
                                            <div className="font-bold leading-tight pr-8" style={{ fontSize: `${config.fontSize + 2}pt` }}>
                                                {targets[0].itemName}
                                            </div>
                                            <div className="font-mono mt-1" style={{ fontSize: `${config.fontSize}pt` }}>
                                                {targets[0].sku}
                                            </div>
                                            
                                            <div className="mt-2 leading-tight" style={{ fontSize: `${config.fontSize - 1}pt` }}>
                                                <div>{targets[0].gemType} • {targets[0].color}</div>
                                                <div className="mt-0.5">
                                                    {targets[0].weightValue} {targets[0].weightUnit}
                                                    {targets[0].weightRatti ? ` (${targets[0].weightRatti.toFixed(2)} R)` : ''}
                                                </div>
                                                {previewPriceText && (
                                                    <div className="font-bold mt-1">{previewPriceText}</div>
                                                )}
                                            </div>
                                            
                                            <div className="absolute bottom-0 w-full text-center text-gray-500" 
                                                style={{ fontSize: `${config.fontSize - 3}pt` }}>
                                                KHYATI GEMS
                                            </div>
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
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
