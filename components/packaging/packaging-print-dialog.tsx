"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Printer, TestTube2 } from "lucide-react";
import type { Inventory } from "@prisma/client";
import {
  createObjectUrl,
  generatePackagingPdfBlob,
  generatePackagingTestSheetBlob,
  PackagingFieldId,
  PackagingLabelData,
  PackagingRenderOptions,
  PackagingSheetLayout,
} from "@/lib/packaging-pdf-generator";
import {
  getDefaultPackagingLayoutPreset,
  getPackagingLayoutPresets,
  getPackagingSettings,
  processPackagingPrint,
} from "@/app/erp/packaging/actions";
import { computeWeightGrams } from "@/lib/utils";

type Preset = {
  id: string;
  name: string;
  unit: string;
  pageWidthMm: number;
  pageHeightMm: number;
  cols: number;
  rows: number;
  labelWidthMm: number;
  labelHeightMm: number;
  marginLeftMm: number;
  marginTopMm: number;
  gapXmm: number;
  gapYmm: number;
  offsetXmm: number;
  offsetYmm: number;
  startPosition: number;
  selectedFieldsJson: string | null;
  isDefault: boolean;
};

const FIELD_OPTIONS: Array<{ id: PackagingFieldId; label: string }> = [
  { id: "header", label: "Header" },
  { id: "qr", label: "QR" },
  { id: "barcode", label: "Barcode" },
  { id: "price", label: "MRP" },
  { id: "origin", label: "Origin" },
  { id: "weight", label: "Weight" },
  { id: "footer", label: "Footer" },
];

const DEFAULT_FIELDS: PackagingFieldId[] = ["header", "footer", "qr", "barcode", "price", "origin", "weight"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseNumber(v: string, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function mmToIn(mm: number) {
  return mm / 25.4;
}

function inToMm(inches: number) {
  return inches * 25.4;
}

function resolvePackingDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function parseFields(json: string | null): PackagingFieldId[] {
  if (!json) return [...DEFAULT_FIELDS];
  try {
    const arr = JSON.parse(json) as PackagingFieldId[];
    return Array.isArray(arr) && arr.length ? arr : [...DEFAULT_FIELDS];
  } catch {
    return [...DEFAULT_FIELDS];
  }
}

type PackagingSettingsLite = {
  brandName?: string | null;
  tagline?: string | null;
  estYear?: string | null;
  logoUrl?: string | null;
  careInstruction?: string | null;
  legalMetrologyLine?: string | null;
  supportEmail?: string | null;
  supportPhone?: string | null;
  supportTimings?: string | null;
  website?: string | null;
  watermarkText?: string | null;
  watermarkOpacity?: number | null;
  watermarkRotation?: number | null;
  watermarkFontSize?: number | null;
  watermarkFontFamily?: string | null;
  microBorderText?: string | null;
  toleranceCarat?: number | null;
  toleranceGram?: number | null;
  labelVersion?: string | null;
  iec?: string | null;
  gstin?: string | null;
};

type InventoryPreviewItem = Inventory & {
  stoneType?: string | null;
  categoryCode?: string | null;
  condition?: string | null;
  weightRatti?: number | null;
  clarityGrade?: string | null;
  cutGrade?: string | null;
  originCountry?: string | null;
  cutPolishedIn?: string | null;
  certificateLab?: string | null;
  certificateNo?: string | null;
  certificateNumber?: string | null;
  dimensionsMm?: string | null;
  batchId?: string | null;
  hsnCode?: string | null;
  qcCode?: string | null;
  lab?: string | null;
  color?: string | null;
  clarity?: string | null;
  cut?: string | null;
};

function websiteValue(settings: PackagingSettingsLite | null) {
  return settings?.website || "www.khyatigems.com";
}

export type PackagingPrintDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryIds?: string[];
  previewItems?: Inventory[];
  labels?: PackagingLabelData[];
  bypass?: boolean;
  onPrintComplete?: () => void;
};

export function PackagingPrintDialog({
  open,
  onOpenChange,
  inventoryIds,
  previewItems,
  labels,
  bypass,
  onPrintComplete,
}: PackagingPrintDialogProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "layout">("preview");
  const [isWorking, setIsWorking] = useState(false);
  const [manufacturingDate, setManufacturingDate] = useState("");
  const [dateDraft, setDateDraft] = useState("");
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const pendingPrintRef = useRef(false);
  const [labelVariant, setLabelVariant] = useState<"RETAIL" | "EXPORT">("RETAIL");
  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [previewScale, setPreviewScale] = useState(1);

  const [settings, setSettings] = useState<PackagingSettingsLite | null>(null);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string>("");

  const [unit, setUnit] = useState<"MM" | "IN">("MM");
  const [layoutMm, setLayoutMm] = useState<PackagingSheetLayout>({
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 2,
    rows: 5,
    labelWidthMm: 100,
    labelHeightMm: 50,
    marginLeftMm: 4,
    marginTopMm: 24,
    gapXmm: 2,
    gapYmm: 0,
    offsetXmm: 0,
    offsetYmm: 0,
    startPosition: 1,
  });

  const [selectedFields, setSelectedFields] = useState<PackagingFieldId[]>([...DEFAULT_FIELDS]);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const perPage = Math.max(1, layoutMm.cols * layoutMm.rows);
  const settingsKey = useMemo(() => {
    if (!settings) return "";
    return JSON.stringify({
      brandName: settings.brandName,
      tagline: settings.tagline,
      estYear: settings.estYear,
      logoUrl: settings.logoUrl,
      careInstruction: settings.careInstruction,
      legalMetrologyLine: settings.legalMetrologyLine,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      website: settings.website,
      watermarkText: settings.watermarkText,
      watermarkOpacity: settings.watermarkOpacity,
      watermarkRotation: settings.watermarkRotation,
      watermarkFontSize: settings.watermarkFontSize,
      microBorderText: settings.microBorderText,
      toleranceCarat: settings.toleranceCarat,
      toleranceGram: settings.toleranceGram,
      labelVersion: settings.labelVersion,
      iec: settings.iec,
      gstin: settings.gstin,
    });
  }, [settings]);
  const previewKey = useMemo(() => {
    return JSON.stringify({
      layoutMm,
      selectedFields,
      settingsKey,
      labelsCount: labels?.length ?? 0,
      itemsCount: previewItems?.length ?? 0,
      manufacturingDate,
    });
  }, [layoutMm, selectedFields, settingsKey, labels?.length, previewItems?.length, manufacturingDate]);

  const previewBase = useMemo(() => {
    const mmToPx = 3.7795275591;
    return {
      width: layoutMm.pageWidthMm * mmToPx,
      height: layoutMm.pageHeightMm * mmToPx,
    };
  }, [layoutMm.pageWidthMm, layoutMm.pageHeightMm]);

  const fitsSheet = useMemo(() => {
    const totalW = layoutMm.marginLeftMm + layoutMm.cols * layoutMm.labelWidthMm + (layoutMm.cols - 1) * layoutMm.gapXmm;
    const totalH = layoutMm.marginTopMm + layoutMm.rows * layoutMm.labelHeightMm + (layoutMm.rows - 1) * layoutMm.gapYmm;
    return totalW <= layoutMm.pageWidthMm && totalH <= layoutMm.pageHeightMm;
  }, [layoutMm]);

  const renderOptions: PackagingRenderOptions = useMemo(
    () => ({
      selectedFields,
      drawGuides: true,
      drawCellNumbers: false,
    }),
    [selectedFields]
  );

  const applyPreset = useCallback((p: Preset) => {
    setPresetId(p.id);
    setUnit((p.unit === "IN" ? "IN" : "MM") as "MM" | "IN");
    setLayoutMm({
      pageWidthMm: p.pageWidthMm,
      pageHeightMm: p.pageHeightMm,
      cols: p.cols,
      rows: p.rows,
      labelWidthMm: p.labelWidthMm,
      labelHeightMm: p.labelHeightMm,
      marginLeftMm: p.marginLeftMm,
      marginTopMm: p.marginTopMm,
      gapXmm: p.gapXmm,
      gapYmm: p.gapYmm,
      offsetXmm: p.offsetXmm,
      offsetYmm: p.offsetYmm,
      startPosition: clamp(p.startPosition || 1, 1, Math.max(1, p.cols * p.rows)),
    });
    setSelectedFields(parseFields(p.selectedFieldsJson));
  }, []);

  const loadDefaults = useCallback(async () => {
    setIsWorking(true);
    try {
      const [settingsRes, presetRes, presetsRes] = await Promise.all([
        getPackagingSettings(),
        getDefaultPackagingLayoutPreset(),
        getPackagingLayoutPresets(),
      ]);
      if (settingsRes.success) setSettings(settingsRes.data as PackagingSettingsLite);
      if (presetsRes.success) setPresets((presetsRes.data as Preset[]) || []);
      if (presetRes.success && presetRes.data) applyPreset(presetRes.data as Preset);
    } catch {
      toast.error("Failed to load print settings");
    } finally {
      setIsWorking(false);
    }
  }, [applyPreset]);

  useEffect(() => {
    if (!open) return;
    setActiveTab("preview");
    loadDefaults();
  }, [open, loadDefaults]);

  useEffect(() => {
    if (!open) return;
    const hasSource = (labels && labels.length) || (previewItems && previewItems.length && settings);
    if (!hasSource) return;
    const previewPackingDate = manufacturingDate ? resolvePackingDate(manufacturingDate) : new Date();
    let cancelled = false;
    (async () => {
      try {
        const previewLabels: PackagingLabelData[] =
          labels && labels.length
            ? labels.map(label => ({
                ...label,
                packingDate: previewPackingDate,
              }))
            : (previewItems || []).map((inv, idx: number) => {
                const item = inv as InventoryPreviewItem;
                return {
                  serial: `PREVIEW-${item.sku}-${idx + 1}`,
                  sku: item.sku,
                  gemstoneName: item.itemName,
                  category: item.category ?? undefined,
                  categoryCode: item.categoryCode ?? undefined,
                  stoneType: item.stoneType || item.gemType || "",
                  condition: item.condition || "New",
                  weightCarat: item.weightValue ?? 0,
                  weightRatti: item.weightRatti ?? undefined,
                  weightGrams: computeWeightGrams(item),
                  dimensionsMm: item.dimensionsMm ?? undefined,
                  batchId: item.batchId || undefined,
                  color: item.color ?? undefined,
                  clarity: item.clarity ?? undefined,
                  clarityGrade: item.clarityGrade ?? undefined,
                  cut: item.cut ?? undefined,
                  cutGrade: item.cutGrade ?? undefined,
                  treatment: item.treatment || "",
                  origin: item.origin ?? undefined,
                  originCountry: item.originCountry ?? undefined,
                  cutPolishedIn: item.cutPolishedIn ?? undefined,
                  certificateLab: item.certificateLab || item.lab || undefined,
                  certificateNo: item.certificateNo || undefined,
                  certificateNumber: item.certificateNumber ?? undefined,
                  mrp: item.sellingPrice || 0,
                  hsn: item.hsnCode || "7103",
                  inventoryLocation: item.stockLocation ?? undefined,
                  qcCode: item.qcCode ?? undefined,
                  packingDate: previewPackingDate,
                  printJobId: "PJ-PREVIEW",
                  unitQuantity: 1,
                  madeIn: "India",
                  declaredOriginal: true,
                  brandName: settings?.brandName ?? undefined,
                  tagline: settings?.tagline ?? undefined,
                  estYear: settings?.estYear ?? undefined,
                  logoUrl: settings?.logoUrl ?? undefined,
                  careInstruction: settings?.careInstruction ?? undefined,
                  legalMetrology: settings?.legalMetrologyLine ?? undefined,
                  supportEmail: settings?.supportEmail ?? undefined,
                  supportPhone: settings?.supportPhone ?? undefined,
                  supportTimings: settings?.supportTimings ?? undefined,
                  supportWebsite: websiteValue(settings),
                  watermarkText: settings?.watermarkText ?? undefined,
                  watermarkOpacity: settings?.watermarkOpacity ?? undefined,
                  watermarkRotation: settings?.watermarkRotation ?? undefined,
                  watermarkFontSize: settings?.watermarkFontSize ?? undefined,
                  watermarkFontFamily: settings?.watermarkFontFamily ?? undefined,
                  microBorderText: settings?.microBorderText ?? undefined,
                  toleranceCarat: settings?.toleranceCarat ?? undefined,
                  toleranceGram: settings?.toleranceGram ?? undefined,
                  labelVersion: settings?.labelVersion ?? undefined,
                  iec: settings?.iec ?? undefined,
                  gstin: settings?.gstin ?? undefined,
                  labelVariant,
                };
              });
        const blob = await generatePackagingPdfBlob(previewLabels, layoutMm, renderOptions);
        if (cancelled) return;
        const url = createObjectUrl(blob);
        const prev = previewUrlRef.current;
        previewUrlRef.current = url;
        setPreviewUrl(url);
        if (prev) URL.revokeObjectURL(prev);
      } catch (err) {
        console.error("Preview generation failed:", err);
        if (!cancelled) toast.error("Failed to generate preview");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, previewKey, labels, previewItems, settings, layoutMm, renderOptions, manufacturingDate, labelVariant]);

  useEffect(() => {
    if (open) return;
    const prev = previewUrlRef.current;
    if (prev) URL.revokeObjectURL(prev);
    previewUrlRef.current = null;
    setPreviewUrl(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = previewContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const nextScale = Math.min(rect.width / previewBase.width, rect.height / previewBase.height, 1);
      setPreviewScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, previewBase.height, previewBase.width]);

  const setField = (id: PackagingFieldId, checked: boolean) => {
    setSelectedFields(prev => (checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id)));
  };

  const uiValues = useMemo(() => {
    const conv = unit === "MM" ? (n: number) => n : mmToIn;
    return {
      pageWidth: conv(layoutMm.pageWidthMm),
      pageHeight: conv(layoutMm.pageHeightMm),
      labelWidth: conv(layoutMm.labelWidthMm),
      labelHeight: conv(layoutMm.labelHeightMm),
      marginLeft: conv(layoutMm.marginLeftMm),
      marginTop: conv(layoutMm.marginTopMm),
      gapX: conv(layoutMm.gapXmm),
      gapY: conv(layoutMm.gapYmm),
      offsetX: conv(layoutMm.offsetXmm),
      offsetY: conv(layoutMm.offsetYmm),
    };
  }, [layoutMm, unit]);

  const setUiValue = <K extends keyof typeof uiValues>(key: K, v: string) => {
    const num = parseNumber(v, uiValues[key]);
    const mm = unit === "MM" ? num : inToMm(num);
    setLayoutMm(prev => {
      const next = { ...prev };
      if (key === "pageWidth") next.pageWidthMm = mm;
      if (key === "pageHeight") next.pageHeightMm = mm;
      if (key === "labelWidth") next.labelWidthMm = mm;
      if (key === "labelHeight") next.labelHeightMm = mm;
      if (key === "marginLeft") next.marginLeftMm = mm;
      if (key === "marginTop") next.marginTopMm = mm;
      if (key === "gapX") next.gapXmm = mm;
      if (key === "gapY") next.gapYmm = mm;
      if (key === "offsetX") next.offsetXmm = mm;
      if (key === "offsetY") next.offsetYmm = mm;
      return next;
    });
  };

  const setStartPosition = (n: number) => {
    setLayoutMm(prev => ({ ...prev, startPosition: clamp(n, 1, perPage) }));
  };

  const handleTestPrint = async () => {
    if (!fitsSheet) {
      toast.error("Layout exceeds page size");
      return;
    }
    setIsWorking(true);
    try {
      const blob = await generatePackagingTestSheetBlob(layoutMm);
      const url = createObjectUrl(blob);
      const win = window.open(url, "_blank");
      if (!win) toast.error("Please allow popups to print");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate test print";
      toast.error(msg);
    } finally {
      setIsWorking(false);
    }
  };

  const runPrint = async (dateValue: string) => {
    if (!fitsSheet) {
      toast.error("Layout exceeds page size");
      return;
    }
    setIsWorking(true);
    try {
      let labelData: PackagingLabelData[];
      if (labels && labels.length) {
        labelData = labels;
      } else if (inventoryIds && inventoryIds.length) {
        const res = await processPackagingPrint(inventoryIds, bypass);
        if (!res.success) {
          toast.error(res.message || "Failed to prepare print");
          return;
        }
        labelData = res.labels as unknown as PackagingLabelData[];
      } else {
        toast.error("No items selected");
        return;
      }
      const packedDate = resolvePackingDate(dateValue);
      labelData = labelData.map(label => ({
        ...label,
        packingDate: packedDate,
        labelVariant,
      }));
      const blob = await generatePackagingPdfBlob(labelData, layoutMm, { selectedFields, drawGuides: false });
      const url = createObjectUrl(blob);
      const win = window.open(url, "_blank");
      if (!win) {
        toast.error("Please allow popups to print");
        return;
      }
      onPrintComplete?.();
      onOpenChange(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate print";
      toast.error(msg);
    } finally {
      setIsWorking(false);
    }
  };

  const handlePrint = async () => {
    if (!manufacturingDate) {
      pendingPrintRef.current = true;
      setDateDraft(new Date().toISOString().slice(0, 10));
      setDateDialogOpen(true);
      return;
    }
    await runPrint(manufacturingDate);
  };

  const handleConfirmManufacturingDate = async () => {
    if (!dateDraft) {
      toast.error("Select manufacturing date");
      return;
    }
    setManufacturingDate(dateDraft);
    setDateDialogOpen(false);
    if (pendingPrintRef.current) {
      pendingPrintRef.current = false;
      await runPrint(dateDraft);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl w-[min(96vw,1200px)] h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Print Packaging Labels</DialogTitle>
            <DialogDescription>Preview label placement, select fields, and adjust sheet offsets.</DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v === "layout" ? "layout" : "preview")}
            className="w-full flex-1 overflow-hidden min-h-0"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview & Print</TabsTrigger>
              <TabsTrigger value="layout">Layout Settings</TabsTrigger>
            </TabsList>

          <TabsContent value="preview" className="h-full pt-4 overflow-hidden min-h-0">
            <div className="flex h-full gap-4 min-h-0">
              <div className="w-[380px] shrink-0 flex flex-col gap-3 min-h-0">
                <div className="rounded-md border p-3 space-y-2">
                  <Label>Layout Preset</Label>
                  <Select value={presetId} onValueChange={(id) => {
                    const p = presets.find(x => x.id === id);
                    if (p) applyPreset(p);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose preset" />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.isDefault ? " (default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1 overflow-auto pr-2 space-y-4 min-h-0">
                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-medium">Manufacturing Date</div>
                    <div className="text-sm text-muted-foreground">
                      {manufacturingDate ? `Selected: ${manufacturingDate}` : "No date selected yet"}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDateDraft(manufacturingDate || new Date().toISOString().slice(0, 10));
                        setDateDialogOpen(true);
                      }}
                    >
                      {manufacturingDate ? "Change Date" : "Set Date"}
                    </Button>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-medium">Label Variant</div>
                    <Select value={labelVariant} onValueChange={(value) => setLabelVariant(value === "EXPORT" ? "EXPORT" : "RETAIL")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose variant" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RETAIL">Retail Premium (India)</SelectItem>
                        <SelectItem value="EXPORT">Export / International</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-muted-foreground">
                      Retail shows MRP & legal metrology. Export shows HS/IEC & customs data.
                    </div>
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <div className="text-sm font-medium">Fields</div>
                    <div className="grid grid-cols-2 gap-2">
                      {FIELD_OPTIONS.map(f => (
                        <div key={f.id} className="flex items-center gap-2">
                          <Checkbox checked={selectedFields.includes(f.id)} onCheckedChange={(v) => setField(f.id, !!v)} />
                          <span className="text-sm">{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Start Position</div>
                      <Input
                        type="number"
                        min="1"
                        max={perPage}
                        value={layoutMm.startPosition}
                        onChange={(e) => setStartPosition(parseNumber(e.target.value, layoutMm.startPosition))}
                        className="w-[120px]"
                      />
                    </div>
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(layoutMm.cols, 6)}, minmax(0, 1fr))` }}>
                      {Array.from({ length: perPage }).map((_, idx) => {
                        const n = idx + 1;
                        const active = n === layoutMm.startPosition;
                        return (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setStartPosition(n)}
                            className={[
                              "h-10 rounded border text-sm",
                              active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 hover:bg-muted",
                            ].join(" ")}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                    {!fitsSheet && <div className="text-sm text-destructive">Layout exceeds page size.</div>}
                  </div>
                </div>

                <div className="rounded-md border p-3 flex flex-col gap-2">
                  <Button onClick={handlePrint} disabled={isWorking || isWorking || !fitsSheet}>
                    {isWorking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Printer className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                  <Button variant="outline" onClick={handleTestPrint} disabled={isWorking}>
                    <TestTube2 className="h-4 w-4 mr-2" />
                    Test Print Sheet
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-w-0 rounded-md border bg-muted/20 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
                  <span>Preview</span>
                  <span>{Math.round(previewScale * 100)}% • {layoutMm.pageWidthMm}×{layoutMm.pageHeightMm}mm</span>
                </div>
                <div ref={previewContainerRef} className="flex-1 min-h-0 flex items-center justify-center">
                  {previewUrl ? (
                    <div
                      style={{
                        width: previewBase.width,
                        height: previewBase.height,
                        transform: `scale(${previewScale})`,
                        transformOrigin: "top left",
                      }}
                    >
                      <iframe src={previewUrl} className="w-full h-full border-none" title="Packaging Preview" />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                      {isWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generating preview..."}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="pt-4 space-y-4 overflow-auto max-h-[70vh] min-h-0">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Units</Label>
                <Select value={unit} onValueChange={(v) => setUnit(v as "MM" | "IN")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM">mm</SelectItem>
                    <SelectItem value="IN">in</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Page Width ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.pageWidth} onChange={(e) => setUiValue("pageWidth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Page Height ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.pageHeight} onChange={(e) => setUiValue("pageHeight", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Columns</Label>
                <Input
                  type="number"
                  min="1"
                  value={layoutMm.cols}
                  onChange={(e) => setLayoutMm(prev => ({ ...prev, cols: parseNumber(e.target.value, prev.cols) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Rows</Label>
                <Input
                  type="number"
                  min="1"
                  value={layoutMm.rows}
                  onChange={(e) => setLayoutMm(prev => ({ ...prev, rows: parseNumber(e.target.value, prev.rows) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Position</Label>
                <Input
                  type="number"
                  min="1"
                  max={perPage}
                  value={layoutMm.startPosition}
                  onChange={(e) => setStartPosition(parseNumber(e.target.value, layoutMm.startPosition))}
                />
              </div>

              <div className="space-y-2">
                <Label>Label Width ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.labelWidth} onChange={(e) => setUiValue("labelWidth", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Label Height ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.labelHeight} onChange={(e) => setUiValue("labelHeight", e.target.value)} />
              </div>
              <div />

              <div className="space-y-2">
                <Label>Left Margin ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.marginLeft} onChange={(e) => setUiValue("marginLeft", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Top Margin ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.marginTop} onChange={(e) => setUiValue("marginTop", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>H-Gap ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.gapX} onChange={(e) => setUiValue("gapX", e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>V-Gap ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.gapY} onChange={(e) => setUiValue("gapY", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Offset X ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.offsetX} onChange={(e) => setUiValue("offsetX", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Offset Y ({unit.toLowerCase()})</Label>
                <Input type="number" value={uiValues.offsetY} onChange={(e) => setUiValue("offsetY", e.target.value)} />
              </div>
            </div>
            {!fitsSheet && <div className="text-sm text-destructive">Layout exceeds page size.</div>}
          </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manufacturing Date</DialogTitle>
            <DialogDescription>Select the manufacturing date to print on all labels.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="date"
              value={dateDraft}
              onChange={(e) => setDateDraft(e.target.value)}
            />
            <div className="text-xs text-muted-foreground">
              This date appears on the label as Mfg Date.
            </div>
            <Button onClick={handleConfirmManufacturingDate}>Apply Date</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
