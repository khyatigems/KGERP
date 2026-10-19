"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { generateLabelPDF, LabelConfig, DEFAULT_TAG_CONFIG, DEFAULT_A4_CONFIG, DEFAULT_THERMAL_CONFIG, LabelItem, DEFAULT_FIELDS } from "@/lib/label-generator";
import { analyzeThermalLabel, buildThermalQrValue, suggestThermalFieldRemovals, THERMAL_FIELD_LABELS, ThermalLabelElement } from "@/lib/thermal-label-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { createLabelJob, updateLabelJobStatus } from "@/app/(dashboard)/labels/actions";
import { getCompanySettings } from "@/app/(dashboard)/settings/company/actions";

const AVAILABLE_FIELDS_UI = [
    { id: "itemName", label: "Item Name" },
    { id: "internalName", label: "Internal Name" },
    { id: "sku", label: "SKU" },
    { id: "qrCode", label: "QR Code" },
    { id: "barcode", label: "SKU Barcode" },
    { id: "gemType", label: "Gem Type" },
    { id: "color", label: "Color" },
    { id: "shape", label: "Shape" },
    { id: "weight", label: "Weight" },
    { id: "dimensions", label: "Dimensions" },
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
    const [config, setConfig] = useState<LabelConfig>(DEFAULT_THERMAL_CONFIG);
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
                const parsed = JSON.parse(saved) as Partial<LabelConfig>;
                setConfig({
                    ...DEFAULT_THERMAL_CONFIG,
                    ...parsed,
                    includeChecksumInR: parsed.includeChecksumInR ?? true,
                });
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
    const [previewIndex, setPreviewIndex] = useState(0);

    const targets = useMemo(() => items && items.length > 0 ? items : (item ? [item] : []), [items, item]);
    const visibleIndex = Math.min(previewIndex, Math.max(0, targets.length - 1));
    const [previewZoom, setPreviewZoom] = useState("2");
    // One measured layout per item feeds the preview, the preflight issues, and the final PDF.
    const thermalAnalysis = useMemo(() => {
        if (config.pageSize !== "THERMAL" || !open || !targets.length || typeof window === "undefined") return null;
        const origin = window.location.origin;
        const layouts = targets.map(target => ({ layout: analyzeThermalLabel(target, config, buildThermalQrValue(target.sku, origin), { autoFit: true }) }));
        return { fits: layouts.every(entry => entry.layout.fits), layouts };
    }, [config, targets, open]);

    const handleFormatChange = (format: "TAG" | "A4" | "THERMAL") => {
        let defaults: LabelConfig;
        if (format === "TAG") defaults = DEFAULT_TAG_CONFIG;
        else if (format === "THERMAL") defaults = DEFAULT_THERMAL_CONFIG;
        else defaults = DEFAULT_A4_CONFIG;
        
        setConfig({ 
            ...defaults, 
            showPrice: config.showPrice,
            includeChecksumInR: config.includeChecksumInR ?? true,
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
            setConfig({ ...DEFAULT_TAG_CONFIG, ...found.config, includeChecksumInR: found.config.includeChecksumInR ?? true });
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
            includeChecksumInR: config.includeChecksumInR ?? true,
            selectedFields: config.selectedFields || DEFAULT_FIELDS
        });
    };

    const setThermalRollPreset = () => {
        // Exeo 9250 direct-thermal roll: 50 x 25 mm labels with 2.5 mm backing gaps
        // (the printer pitch is 27.5 mm; only the 25 mm face is printable).
        setConfig({
            ...DEFAULT_THERMAL_CONFIG,
            labelWidth: 50,
            labelHeight: 25,
            marginTop: 0,
            marginLeft: 0,
            horizontalGap: 0,
            verticalGap: 0,
            qrSize: 11,
            fontSize: 8,
            showPrice: config.showPrice,
            includeChecksumInR: config.includeChecksumInR ?? true,
            selectedFields: config.selectedFields || DEFAULT_FIELDS
        });
    };

    const handlePrint = async () => {
        if (config.pageSize === "THERMAL") {
            const source = thermalAnalysis?.layouts ?? targets.map(target => ({ layout: analyzeThermalLabel(target, config, buildThermalQrValue(target.sku, window.location.origin)) }));
            if (source.some(entry => !entry.layout.fits)) {
                const first = source.find(entry => !entry.layout.fits)!.layout.issues.find(entry => entry.severity === "error");
                const removal = first && config.selectedFields.includes(first.field) ? ` Try removing "${THERMAL_FIELD_LABELS[first.field] ?? first.field}" first.` : "";
                toast.error(`Some labels will not print safely: ${first?.message ?? "content exceeds the printable area"}.${removal}`);
                return;
            }
        }
        setIsPrinting(true);
        const printWindow = window.open("about:blank", "_blank");
        let jobId: string | undefined;
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
            jobId = res.jobId;

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
            if (jobId) {
                const completed = await updateLabelJobStatus(jobId, "COMPLETED");
                if (!completed.success) throw new Error(completed.message || "Unable to complete the print job; your queue has been retained.");
            }
            
            // Open PDF
            if (!printWindow) {
                const download = document.createElement("a");
                download.href = String(pdfUrl);
                download.download = "KhyatiGems-Labels.pdf";
                download.click();
                toast.success("Labels generated. Open the downloaded PDF to print.");
            } else {
                printWindow.location.href = String(pdfUrl);
                toast.success("Labels generated successfully");
            }
            
            if (onPrintComplete) {
                onPrintComplete();
            }
        } catch (error: unknown) {
            printWindow?.close();
            console.error("Print failed", error);
            const msg = error instanceof Error ? error.message : "Failed to generate labels";
            if (jobId) {
                try {
                    await updateLabelJobStatus(jobId, "FAILED");
                } catch {}
            }
            
            if (msg.includes("Session invalid")) {
                toast.error("Session expired. Redirecting to login...");
                setTimeout(() => {
                    window.location.href = "/login";
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
            <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Print Labels</DialogTitle>
                    <DialogDescription>
                        Exeo 9250 thermal labels. Match the loaded label size, review content, and resolve fitting issues before printing.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="preview">Preview & Print</TabsTrigger>
                        <TabsTrigger value="settings">Layout Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="preview" className="space-y-4 py-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-4 items-center justify-between">
                                <div className="space-y-1">
                                    <Label>Label Format</Label>
                                    <Select 
                                        value={config.pageSize} 
                                        onValueChange={(v: "TAG" | "A4" | "THERMAL") => handleFormatChange(v)}
                                    >
                                        <SelectTrigger className="w-50">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TAG">Tag (40x25)</SelectItem>
                                            <SelectItem value="THERMAL">Thermal (50x25)</SelectItem>
                                            <SelectItem value="A4">A4 Sheet (Grid)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        id="includeChecksumInR"
                                        checked={config.includeChecksumInR ?? true}
                                        onCheckedChange={(v) => setConfig({ ...config, includeChecksumInR: Boolean(v) })}
                                    />
                                    <Label htmlFor="includeChecksumInR" className="cursor-pointer">
                                        Include checksum in R price
                                    </Label>
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
                                             <Label htmlFor={`field-${field.id}`} className="cursor-pointer">{field.label}{field.id === "internalName" && !targets[visibleIndex]?.internalName?.trim() && <span className="block text-xs text-amber-600 dark:text-amber-400">No saved internal name on this item</span>}</Label>
                                         </div>
                                    ))}
                                </div>
                            </div>
                            
                            {config.pageSize === "THERMAL" && targets.length > 1 && (
                                <div className="flex items-center justify-between gap-3">
                                    <Button variant="outline" size="sm" disabled={visibleIndex === 0} onClick={() => setPreviewIndex(visibleIndex - 1)}>Previous</Button>
                                    <span className="text-sm">{visibleIndex + 1} / {targets.length} · {targets[visibleIndex].sku}</span>
                                    <Button variant="outline" size="sm" disabled={visibleIndex === targets.length - 1} onClick={() => setPreviewIndex(visibleIndex + 1)}>Next</Button>
                                </div>
                            )}
                            <div className="rounded-xl border bg-muted/20 overflow-hidden">
                                <div className="flex items-center justify-between gap-3 border-b p-3">
                                    <div><p className="text-sm font-medium">Print preview</p><p className="text-xs text-muted-foreground">Dashed guide marks the safe area and will not print.</p></div>
                                    <Select value={previewZoom} onValueChange={setPreviewZoom}><SelectTrigger aria-label="Preview zoom" className="w-28"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">100%</SelectItem><SelectItem value="1.5">150%</SelectItem><SelectItem value="2">200%</SelectItem></SelectContent></Select>
                                </div>
                                <div className="overflow-auto p-6"><div className="grid min-w-max place-items-center gap-5">
                                <div
                                    className="bg-white border border-gray-300 shadow-sm relative overflow-hidden"
                                    style={{
                                        width: `${config.labelWidth}mm`,
                                        height: `${config.labelHeight}mm`,
                                        padding: config.pageSize === "THERMAL" ? 0 : "2mm",
                                        zoom: Number(previewZoom),
                                        flexShrink: 0,
                                    }}
                                >
                                    {config.pageSize === "THERMAL" && (
                                        <div aria-hidden="true" className="absolute border border-dashed border-sky-400 pointer-events-none" style={{ inset: `${config.safeMargin ?? 1.5}mm` }} />
                                    )}
                                    {/* Preview Content */}
                                    {targets[0] && (
                                        config.pageSize === "THERMAL" && thermalAnalysis ? (
                                            <ExeoThermalLabelPreview elements={thermalAnalysis.layouts[visibleIndex].layout.elements} />
                                        ) : config.pageSize === "THERMAL" ? (
                                            <div className="text-[7px] text-muted-foreground flex items-center justify-center h-full">Analysing layout…</div>
                                        ) : (
                                            /* Grid Layout Preview */
                                            <div
                                                className="grid gap-2 p-4 bg-white shadow-sm overflow-auto max-h-100"
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
                                </div></div>
                                <div className="border-t p-4 space-y-3">
                                {thermalAnalysis && <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="rounded-md border bg-background px-2.5 py-1.5">Text: <strong>{thermalAnalysis.layouts[visibleIndex].layout.appliedFontSize.toFixed(1)} pt</strong> (requested {config.fontSize} pt)</span>
                                    {config.selectedFields.includes("qrCode") && <span className="rounded-md border bg-background px-2.5 py-1.5">QR: <strong>{thermalAnalysis.layouts[visibleIndex].layout.appliedQrSize.toFixed(1)} mm</strong></span>}
                                    <span className={`rounded-md border px-2.5 py-1.5 ${thermalAnalysis.layouts[visibleIndex].layout.fits ? "text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "text-amber-700 dark:text-amber-300 border-amber-500/30"}`}>{thermalAnalysis.layouts[visibleIndex].layout.fits ? "Ready to print" : "More space needed"}</span>
                                </div>}
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                    {config.pageSize === "THERMAL" && thermalAnalysis
                                        ? `${config.labelWidth} × ${config.labelHeight} mm · Text needs ${thermalAnalysis.layouts[visibleIndex].layout.requiredTextHeight.toFixed(1)} / ${thermalAnalysis.layouts[visibleIndex].layout.availableTextHeight.toFixed(1)} mm · Footer reserved for selected codes / logo${targets.length > 1 ? ` · checked all ${targets.length} labels` : ""}`
                                        : "Tag / A4 sheet preview"}
                                </div>
                                {config.pageSize === "THERMAL" && thermalAnalysis?.layouts[visibleIndex]?.layout.adjustments.length ? (
                                    <div className="text-xs text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded px-3 py-2">
                                        Auto-fit: {thermalAnalysis.layouts[visibleIndex].layout.adjustments.join(" · ")}. {thermalAnalysis.layouts[visibleIndex].layout.fits ? "All selected content with saved values fits." : "Review remaining issues below."}
                                    </div>
                                ) : null}
                                {thermalAnalysis && thermalAnalysis.layouts[visibleIndex].layout.overflowElements.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
                                    <p className="font-semibold text-amber-700 dark:text-amber-300">Outside the available text area — printing blocked</p>
                                    <p className="text-muted-foreground">Text has reached the readable minimum. These lines are shown here instead of overlapping the barcode or logo.</p>
                                    {thermalAnalysis.layouts[visibleIndex].layout.overflowElements.map((entry, index) => <p key={index}><span className="font-medium">{(entry.fields || [entry.field]).map(field => THERMAL_FIELD_LABELS[field]).join(" / ")}:</span> {entry.text}</p>)}
                                </div>}
                                {thermalAnalysis?.layouts[visibleIndex]?.layout.issues.filter(issue => issue.severity === "warning").map(issue => <p key={`${issue.field}-${issue.message}`} className="text-xs text-amber-700 dark:text-amber-300"><strong>{THERMAL_FIELD_LABELS[issue.field]}:</strong> {issue.message} {issue.suggestion}</p>)}
                                </div>
                            </div>

                            {thermalAnalysis && !thermalAnalysis.fits && (
                                <div className="border rounded-md p-4 space-y-3 bg-destructive/5 border-destructive/30">
                                    <div className="flex items-center justify-between gap-2">
                                        <div>
                                            <p className="font-semibold text-destructive text-sm">Content still does not fit after auto-fit (smallest scannable QR and 6&nbsp;pt minimum font).</p>
                                            <p className="text-xs text-muted-foreground">Suggestions keep item name, SKU, weight, price and both selected codes. Remove optional details or use taller stock.</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const removable = suggestThermalFieldRemovals(targets, config, window.location.origin);
                                                if (!removable.length) {
                                                    toast.error("Only protected essentials remain, yet content still overflows — use a taller label roll or shorten the item's data.");
                                                    return;
                                                }
                                                setConfig(prev => ({ ...prev, selectedFields: prev.selectedFields.filter(f => !removable.includes(f)) }));
                                                toast.success(`Removed: ${removable.map(f => THERMAL_FIELD_LABELS[f] ?? f).join(", ")}`);
                                            }}
                                        >
                                            Apply suggested removals
                                        </Button>
                                    </div>
                                    <ul className="space-y-2 max-h-40 overflow-auto">
                                        {(() => {
                                            const seen = new Set<string>();
                                            const unique = thermalAnalysis.layouts.flatMap(({ layout }) => layout.issues.filter(entry => entry.severity === "error"))
                                                .filter(entry => {
                                                    const key = entry.field;
                                                    if (seen.has(key)) return false;
                                                    seen.add(key);
                                                    return true;
                                                });
                                            return unique.map((entry, idx) => (
                                            <li key={idx} className="flex items-start justify-between gap-3 text-xs">
                                                <div>
                                                    <span className="font-medium">{THERMAL_FIELD_LABELS[entry.field] ?? entry.field}</span>
                                                    {Array.from(new Set(thermalAnalysis.layouts.flatMap(({ layout }) => layout.issues.filter(issue => issue.field === entry.field && issue.severity === "error").map(issue => issue.message)))).map(message => <p key={message}>{message}</p>)}
                                                    <div className="text-muted-foreground">{entry.suggestion}</div>
                                                </div>
                                                {config.selectedFields.includes(entry.field) && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-6 shrink-0"
                                                        onClick={() => setConfig(prev => ({ ...prev, selectedFields: prev.selectedFields.filter(f => f !== entry.field) }))}
                                                    >
                                                        Remove
                                                    </Button>
                                                )}
                                            </li>
                                            ));
                                            })()}
                                        </ul>
                                </div>
                            )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button onClick={handlePrint} disabled={isPrinting || (config.pageSize === "THERMAL" && thermalAnalysis ? !thermalAnalysis.fits : false)}>
                                    {isPrinting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {config.pageSize === "THERMAL" && thermalAnalysis && !thermalAnalysis.fits ? "Fix fitting issues to print" : isPrinting ? "Generating..." : "Print Labels"}
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
                                    <Button variant="secondary" onClick={setThermalRollPreset}>Exeo 9250 Roll (50x25)</Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Saved Presets</Label>
                                <Select onValueChange={(v) => loadPreset(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose preset" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {presets.map((p, idx) => (
                                            <SelectItem key={`${p.name}-${idx}`} value={p.name}>{p.name}</SelectItem>
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

/** Renders the measured thermal layout 1:1 — the same geometry (mm) and font sizes (pt) used by the PDF. */
function ExeoThermalLabelPreview({ elements }: { elements: ThermalLabelElement[] }) {
    return (
        <div className="absolute inset-0 text-black" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
            {elements.map((el, idx) => {
                const pos = { left: `${el.x}mm`, top: `${el.y}mm`, width: `${el.width}mm`, height: `${el.height}mm` };
                if (el.kind === "text") {
                    return (
                        <div key={idx} className="absolute whitespace-pre" style={{ ...pos, fontSize: `${el.fontSize}pt`, lineHeight: `${el.height}mm`, fontWeight: el.bold ? 700 : 400 }}>
                            {el.text}
                        </div>
                    );
                }
                if (el.kind === "qr") {
                    return (
                        <svg key={idx} viewBox={`0 0 ${el.modules + 8} ${el.modules + 8}`} className="absolute" style={pos} shapeRendering="crispEdges">
                            <rect width="100%" height="100%" fill="white" />
                            <path d={el.path} fill="black" />
                        </svg>
                    );
                }
                if (el.kind === "barcode") {
                    return (
                        <svg key={idx} viewBox={`0 0 ${el.modules + 20} 1`} preserveAspectRatio="none" className="absolute" style={pos}>
                            <rect width="100%" height="100%" fill="white" />
                            <path d={el.path} fill="black" />
                        </svg>
                    );
                }
                // Data-URL logo/bitmap sources cannot go through next/image optimization.
                // eslint-disable-next-line @next/next/no-img-element
                return <img key={idx} src={el.source} alt="Logo" className="absolute object-contain" style={pos} />;
            })}
        </div>
    );
}
