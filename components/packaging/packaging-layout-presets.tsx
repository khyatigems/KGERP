"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import {
  deletePackagingLayoutPreset,
  getPackagingLayoutPresets,
  upsertPackagingLayoutPreset,
} from "@/app/erp/packaging/actions";

const FIELD_OPTIONS = [
  { id: "header", label: "Header" },
  { id: "qr", label: "QR" },
  { id: "barcode", label: "Barcode" },
  { id: "price", label: "MRP" },
  { id: "origin", label: "Origin" },
  { id: "weight", label: "Weight" },
  { id: "footer", label: "Footer" },
] as const;

type FieldId = (typeof FIELD_OPTIONS)[number]["id"];

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

const DEFAULT_FIELDS: FieldId[] = ["header", "footer", "qr", "barcode", "price", "origin", "weight"];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mmToIn(mm: number) {
  return mm / 25.4;
}

function inToMm(inches: number) {
  return inches * 25.4;
}

function parseNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function PackagingLayoutPresets() {
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  const [unit, setUnit] = useState<"MM" | "IN">("MM");
  const [name, setName] = useState("");
  const [pageWidth, setPageWidth] = useState(210);
  const [pageHeight, setPageHeight] = useState(297);
  const [cols, setCols] = useState(2);
  const [rows, setRows] = useState(5);
  const [labelWidth, setLabelWidth] = useState(100);
  const [labelHeight, setLabelHeight] = useState(50);
  const [marginLeft, setMarginLeft] = useState(5);
  const [marginTop, setMarginTop] = useState(23.5);
  const [gapX, setGapX] = useState(0);
  const [gapY, setGapY] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [startPosition, setStartPosition] = useState(1);
  const [isDefault, setIsDefault] = useState(false);
  const [selectedFields, setSelectedFields] = useState<FieldId[]>([...DEFAULT_FIELDS]);

  const perPage = Math.max(1, cols * rows);

  const fitsSheet = useMemo(() => {
    const totalW = marginLeft + cols * labelWidth + (cols - 1) * gapX;
    const totalH = marginTop + rows * labelHeight + (rows - 1) * gapY;
    return totalW <= pageWidth && totalH <= pageHeight;
  }, [cols, rows, gapX, gapY, labelWidth, labelHeight, marginLeft, marginTop, pageWidth, pageHeight]);

  const applyPreset = useCallback((p: Preset) => {
    setUnit((p.unit === "IN" ? "IN" : "MM") as "MM" | "IN");
    setName(p.name);
    setPageWidth(p.pageWidthMm);
    setPageHeight(p.pageHeightMm);
    setCols(p.cols);
    setRows(p.rows);
    setLabelWidth(p.labelWidthMm);
    setLabelHeight(p.labelHeightMm);
    setMarginLeft(p.marginLeftMm);
    setMarginTop(p.marginTopMm);
    setGapX(p.gapXmm);
    setGapY(p.gapYmm);
    setOffsetX(p.offsetXmm);
    setOffsetY(p.offsetYmm);
    setStartPosition(clamp(p.startPosition, 1, p.cols * p.rows));
    setIsDefault(p.isDefault);
    try {
      const parsed = p.selectedFieldsJson ? (JSON.parse(p.selectedFieldsJson) as FieldId[]) : DEFAULT_FIELDS;
      setSelectedFields(parsed.length ? parsed : DEFAULT_FIELDS);
    } catch {
      setSelectedFields([...DEFAULT_FIELDS]);
    }
  }, []);

  const loadPresets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPackagingLayoutPresets();
      if (res.success) {
        const list = (res.data as Preset[]) || [];
        setPresets(list);
        const def = list.find(p => p.isDefault) || list[0];
        if (def) {
          setActiveId(def.id);
          applyPreset(def);
        }
      }
    } catch {
      toast.error("Failed to load layout presets");
    } finally {
      setLoading(false);
    }
  }, [applyPreset]);

  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  const onSelectPreset = (id: string) => {
    setActiveId(id);
    const p = presets.find(x => x.id === id);
    if (p) applyPreset(p);
  };

  const valuesForUi = useMemo(() => {
    if (unit === "MM") {
      return {
        pageWidth,
        pageHeight,
        labelWidth,
        labelHeight,
        marginLeft,
        marginTop,
        gapX,
        gapY,
        offsetX,
        offsetY,
      };
    }
    return {
      pageWidth: mmToIn(pageWidth),
      pageHeight: mmToIn(pageHeight),
      labelWidth: mmToIn(labelWidth),
      labelHeight: mmToIn(labelHeight),
      marginLeft: mmToIn(marginLeft),
      marginTop: mmToIn(marginTop),
      gapX: mmToIn(gapX),
      gapY: mmToIn(gapY),
      offsetX: mmToIn(offsetX),
      offsetY: mmToIn(offsetY),
    };
  }, [unit, pageWidth, pageHeight, labelWidth, labelHeight, marginLeft, marginTop, gapX, gapY, offsetX, offsetY]);

  const setFromUi = <K extends keyof typeof valuesForUi>(key: K, v: string) => {
    const num = parseNumber(v, valuesForUi[key]);
    const mm = unit === "MM" ? num : inToMm(num);
    if (key === "pageWidth") setPageWidth(mm);
    if (key === "pageHeight") setPageHeight(mm);
    if (key === "labelWidth") setLabelWidth(mm);
    if (key === "labelHeight") setLabelHeight(mm);
    if (key === "marginLeft") setMarginLeft(mm);
    if (key === "marginTop") setMarginTop(mm);
    if (key === "gapX") setGapX(mm);
    if (key === "gapY") setGapY(mm);
    if (key === "offsetX") setOffsetX(mm);
    if (key === "offsetY") setOffsetY(mm);
  };

  const toggleField = (id: FieldId, checked: boolean) => {
    setSelectedFields(prev => (checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id)));
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Preset name is required");
      return;
    }
    if (!fitsSheet) {
      toast.error("Layout exceeds page size");
      return;
    }
    const sp = clamp(startPosition, 1, perPage);
    setLoading(true);
    try {
      const res = await upsertPackagingLayoutPreset({
        id: activeId || undefined,
        name: name.trim(),
        unit,
        pageWidthMm: pageWidth,
        pageHeightMm: pageHeight,
        cols,
        rows,
        labelWidthMm: labelWidth,
        labelHeightMm: labelHeight,
        marginLeftMm: marginLeft,
        marginTopMm: marginTop,
        gapXmm: gapX,
        gapYmm: gapY,
        offsetXmm: offsetX,
        offsetYmm: offsetY,
        startPosition: sp,
        selectedFieldsJson: JSON.stringify(selectedFields),
        isDefault,
      });
      if (res.success) {
        toast.success("Layout preset saved");
        await loadPresets();
      }
    } catch {
      toast.error("Failed to save preset");
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!activeId) return;
    setLoading(true);
    try {
      await deletePackagingLayoutPreset(activeId);
      toast.success("Preset deleted");
      await loadPresets();
    } catch {
      toast.error("Failed to delete preset");
    } finally {
      setLoading(false);
    }
  };

  const setStartByCell = (cell: number) => {
    setStartPosition(clamp(cell, 1, perPage));
  };

  return (
    <div className="space-y-6 border-t pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Sticker Sheet Layout</h3>
          <p className="text-sm text-muted-foreground">Control label positioning and offsets for pre-cut sheets.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={activeId} onValueChange={onSelectPreset}>
            <SelectTrigger className="w-[260px]">
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
          <Button variant="outline" onClick={remove} disabled={!activeId || loading}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Preset Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
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
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Page Width ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.pageWidth} onChange={(e) => setFromUi("pageWidth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Page Height ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.pageHeight} onChange={(e) => setFromUi("pageHeight", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Columns</Label>
          <Input type="number" min="1" value={cols} onChange={(e) => setCols(parseNumber(e.target.value, cols))} />
        </div>
        <div className="space-y-2">
          <Label>Rows</Label>
          <Input type="number" min="1" value={rows} onChange={(e) => setRows(parseNumber(e.target.value, rows))} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Label Width ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.labelWidth} onChange={(e) => setFromUi("labelWidth", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Label Height ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.labelHeight} onChange={(e) => setFromUi("labelHeight", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>H-Gap ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.gapX} onChange={(e) => setFromUi("gapX", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>V-Gap ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.gapY} onChange={(e) => setFromUi("gapY", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Left Margin ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.marginLeft} onChange={(e) => setFromUi("marginLeft", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Top Margin ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.marginTop} onChange={(e) => setFromUi("marginTop", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Offset X ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.offsetX} onChange={(e) => setFromUi("offsetX", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Offset Y ({unit.toLowerCase()})</Label>
          <Input type="number" value={valuesForUi.offsetY} onChange={(e) => setFromUi("offsetY", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Start Position</Label>
            <Input
              type="number"
              min="1"
              max={perPage}
              value={startPosition}
              onChange={(e) => setStartPosition(clamp(parseNumber(e.target.value, startPosition), 1, perPage))}
              className="w-[140px]"
            />
          </div>
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${Math.min(cols, 8)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: perPage }).map((_, idx) => {
              const n = idx + 1;
              const active = n === startPosition;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStartByCell(n)}
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
          {!fitsSheet && (
            <div className="text-sm text-destructive">
              Layout exceeds page size. Adjust margins, gaps, or label size.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Default Preset</Label>
            <div className="flex items-center gap-2">
              <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(!!v)} />
              <span className="text-sm text-muted-foreground">Use for printing</span>
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <div className="text-sm font-medium">Default Printed Fields</div>
            <div className="grid grid-cols-2 gap-2">
              {FIELD_OPTIONS.map(f => (
                <div key={f.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedFields.includes(f.id)}
                    onCheckedChange={(v) => toggleField(f.id, !!v)}
                  />
                  <span className="text-sm">{f.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button onClick={save} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Preset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
