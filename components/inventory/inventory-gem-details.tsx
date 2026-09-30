"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type UseFormReturn } from "react-hook-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, X, Check } from "lucide-react";
import { createCode } from "@/app/(dashboard)/settings/codes/actions";
import type { CodeRow, FormInputValues } from "./inventory-form.types";

const ORIGIN_PRESETS = ["Burma (Myanmar)", "Sri Lanka (Ceylon)", "Kashmir", "Madagascar", "Mozambique", "Thailand", "Colombia", "Zambia"];
const FLUORESCENCE_PRESETS = ["None", "Faint", "Medium", "Strong", "Very Strong", "Not Applicable"];
const TREATMENT_PRESETS = ["None", "Untreated", "Heat", "Oil", "Resin", "Irradiation", "Diffusion", "Glass-Filled"];
const DEFAULT_SHAPES: CodeRow[] = ["Round", "Oval", "Cushion", "Emerald", "Pear", "Marquise", "Heart", "Other"].map((name) => ({
  id: `default-shape-${name.toLowerCase()}`,
  name,
  code: name.slice(0, 4).toUpperCase(),
  status: "ACTIVE",
}));

interface GemDetailsSectionProps {
  form: UseFormReturn<FormInputValues>;
  gemstones: CodeRow[];
  colors: CodeRow[];
  cuts: CodeRow[];
  shapes?: CodeRow[];
  origins?: string[];
}

export function GemDetailsSection({ form, gemstones, colors, cuts: initialCuts, shapes: initialShapes = [], origins = [] }: GemDetailsSectionProps) {
  const [colorsList, setColorsList] = useState(colors);
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [newColorCode, setNewColorCode] = useState("");
  const [isCreatingColor, setIsCreatingColor] = useState(false);

  const [cutsList, setCutsList] = useState(initialCuts);
  const [isAddingCut, setIsAddingCut] = useState(false);
  const [newCutName, setNewCutName] = useState("");
  const [newCutCode, setNewCutCode] = useState("");
  const [isCreatingCut, setIsCreatingCut] = useState(false);

  const [shapesList, setShapesList] = useState<CodeRow[]>(
    initialShapes.length ? initialShapes : DEFAULT_SHAPES
  );
  const [isAddingShape, setIsAddingShape] = useState(false);
  const [newShapeName, setNewShapeName] = useState("");
  const [newShapeCode, setNewShapeCode] = useState("");
  const [isCreatingShape, setIsCreatingShape] = useState(false);

  const [useCustomOrigin, setUseCustomOrigin] = useState(false);
  const [useCustomTreatment, setUseCustomTreatment] = useState(false);
  const [useCustomFluorescence, setUseCustomFluorescence] = useState(false);

  const gemName = form.watch("gemType");
  const colorName = form.watch("color");
  const shapeName = form.watch("shape");
  const origin = form.watch("origin");
  const fluorescence = form.watch("fluorescence");
  const treatment = form.watch("treatment");

  const shapeOptions: CodeRow[] = [
    ...shapesList,
    ...(shapeName && !shapesList.some((s) => s.name === shapeName)
      ? [{ id: `current-shape-${shapeName}`, name: shapeName, code: "", status: "ACTIVE" }]
      : []),
  ];

  const allOrigins = [...new Set([...ORIGIN_PRESETS, ...origins])];

  useEffect(() => {
    if (origin && !ORIGIN_PRESETS.includes(origin)) setUseCustomOrigin(true);
  }, [origin]);

  useEffect(() => {
    if (fluorescence && !FLUORESCENCE_PRESETS.includes(fluorescence)) setUseCustomFluorescence(true);
  }, [fluorescence]);

  useEffect(() => {
    if (treatment && !TREATMENT_PRESETS.includes(treatment)) setUseCustomTreatment(true);
  }, [treatment]);

  const selectedGemstone = gemstones.find((g) => g.name === gemName);
  const selectedColor = colorsList.find((c) => c.name === colorName);

  useEffect(() => {
    if (selectedGemstone && form.getValues("gemstoneCodeId") !== selectedGemstone.id) {
      form.setValue("gemstoneCodeId", selectedGemstone.id);
    }
  }, [selectedGemstone, form]);

  useEffect(() => {
    if (selectedColor && form.getValues("colorCodeId") !== selectedColor.id) {
      form.setValue("colorCodeId", selectedColor.id);
    }
  }, [selectedColor, form]);

  const handleCreateColor = async () => {
    if (!newColorName || !newColorCode) return;
    setIsCreatingColor(true);
    const formData = new FormData();
    formData.append("name", newColorName);
    formData.append("code", newColorCode);
    formData.append("status", "ACTIVE");
    try {
      const res = await createCode("colors", formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        toast.success("Color added successfully");
        setColorsList(prev =>
          [...prev, { ...res.data, code: res.data.code || "", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        form.setValue("color", res.data.name);
        form.setValue("colorCodeId", res.data.id);
        setIsAddingColor(false);
        setNewColorName("");
        setNewColorCode("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create color");
    } finally {
      setIsCreatingColor(false);
    }
  };

  const handleCreateCut = async () => {
    if (!newCutName || !newCutCode) return;
    setIsCreatingCut(true);
    const formData = new FormData();
    formData.append("name", newCutName);
    formData.append("code", newCutCode);
    formData.append("status", "ACTIVE");
    try {
      const res = await createCode("cuts", formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        toast.success("Cut added successfully");
        setCutsList(prev =>
          [...prev, { ...res.data, code: res.data.code || "", status: "ACTIVE", createdAt: new Date(), updatedAt: new Date() }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        form.setValue("cutCodeId", res.data.id);
        setIsAddingCut(false);
        setNewCutName("");
        setNewCutCode("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create cut");
    } finally {
      setIsCreatingCut(false);
    }
  };

  const handleCreateShape = async () => {
    if (!newShapeName || !newShapeCode) return;
    setIsCreatingShape(true);
    const formData = new FormData();
    formData.append("name", newShapeName);
    formData.append("code", newShapeCode);
    formData.append("status", "ACTIVE");
    try {
      const res = await createCode("shapes", formData);
      if (res.error) {
        toast.error(res.error);
      } else if (res.data) {
        toast.success("Shape added successfully");
        setShapesList(prev =>
          [...prev, { ...res.data, code: res.data.code || "", status: "ACTIVE" }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        form.setValue("shape", res.data.name);
        setIsAddingShape(false);
        setNewShapeName("");
        setNewShapeCode("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to create shape");
    } finally {
      setIsCreatingShape(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card/50 p-5 space-y-4">
        <h3 className="text-base font-semibold">Gem Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="gemType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gem Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {gemstones.filter((g, i, arr) => arr.findIndex((x) => x.name === g.name) === i).map((g) => (
                      <SelectItem key={g.id} value={g.name}>
                        {g.name} ({g.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  Color
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setIsAddingColor(!isAddingColor)}
                  >
                    {isAddingColor ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {isAddingColor ? "Cancel" : "Add Color"}
                  </Button>
                </FormLabel>
                {isAddingColor && (
                  <div className="mb-2 p-3 border rounded-md bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Name</label>
                        <Input
                          value={newColorName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewColorName(val);
                            if (!newColorCode && val) {
                              setNewColorCode(val.slice(0, 4).toUpperCase());
                            }
                          }}
                          placeholder="e.g. Sky Blue"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Code</label>
                        <Input
                          value={newColorCode}
                          onChange={(e) => setNewColorCode(e.target.value.toUpperCase().slice(0, 6))}
                          placeholder="e.g. SKY"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleCreateColor}
                      disabled={!newColorName || !newColorCode || isCreatingColor}
                    >
                      {isCreatingColor ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Save New Color
                    </Button>
                  </div>
                )}
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {colorsList.filter((c, i, arr) => arr.findIndex((x) => x.name === c.name) === i).map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="shape"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  Shape
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setIsAddingShape(!isAddingShape)}
                  >
                    {isAddingShape ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {isAddingShape ? "Cancel" : "Add Shape"}
                  </Button>
                </FormLabel>
                {isAddingShape && (
                  <div className="mb-2 p-3 border rounded-md bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Name</label>
                        <Input
                          value={newShapeName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewShapeName(val);
                            if (!newShapeCode && val) {
                              setNewShapeCode(val.slice(0, 4).toUpperCase());
                            }
                          }}
                          placeholder="e.g. Radiant"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Code</label>
                        <Input
                          value={newShapeCode}
                          onChange={(e) => setNewShapeCode(e.target.value.toUpperCase().slice(0, 6))}
                          placeholder="e.g. RAD"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleCreateShape}
                      disabled={!newShapeName || !newShapeCode || isCreatingShape}
                    >
                      {isCreatingShape ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Save New Shape
                    </Button>
                  </div>
                )}
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shape" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {shapeOptions.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                        {s.code ? ` (${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cutCodeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center justify-between">
                  Cut
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={() => setIsAddingCut(!isAddingCut)}
                  >
                    {isAddingCut ? <X className="w-3 h-3 mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                    {isAddingCut ? "Cancel" : "Add Cut"}
                  </Button>
                </FormLabel>
                {isAddingCut && (
                  <div className="mb-2 p-3 border rounded-md bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Name</label>
                        <Input
                          value={newCutName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setNewCutName(val);
                            if (!newCutCode && val) {
                              setNewCutCode(val.slice(0, 4).toUpperCase());
                            }
                          }}
                          placeholder="e.g. Cabochon"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium">Code</label>
                        <Input
                          value={newCutCode}
                          onChange={(e) => setNewCutCode(e.target.value.toUpperCase().slice(0, 6))}
                          placeholder="e.g. CAB"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-7 text-xs"
                      onClick={handleCreateCut}
                      disabled={!newCutName || !newCutCode || isCreatingCut}
                    >
                      {isCreatingCut ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                      Save New Cut
                    </Button>
                  </div>
                )}
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cut" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {cutsList.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="transparency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transparency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select transparency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Transparent">Transparent</SelectItem>
                    <SelectItem value="Translucent">Translucent</SelectItem>
                    <SelectItem value="Opaque">Opaque</SelectItem>
                    <SelectItem value="Semi-Transparent">Semi-Transparent</SelectItem>
                    <SelectItem value="Semi-Translucent">Semi-Translucent</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="treatment"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Treatment</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setUseCustomTreatment((v) => !v)}
                  >
                    {useCustomTreatment ? "Use Preset" : "Custom"}
                  </Button>
                </div>
                <FormControl>
                  {useCustomTreatment ? (
                    <Input placeholder="e.g. Heat Treated" {...field} />
                  ) : (
                    <Select onValueChange={(val) => field.onChange(val)} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select treatment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Untreated">Untreated</SelectItem>
                        <SelectItem value="Heat">Heat</SelectItem>
                        <SelectItem value="Oil">Oil</SelectItem>
                        <SelectItem value="Resin">Resin</SelectItem>
                        <SelectItem value="Irradiation">Irradiation</SelectItem>
                        <SelectItem value="Diffusion">Diffusion</SelectItem>
                        <SelectItem value="Glass-Filled">Glass-Filled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="origin"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Origin</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setUseCustomOrigin((v) => !v)}
                  >
                    {useCustomOrigin ? "Use Preset" : "Custom"}
                  </Button>
                </div>
                <FormControl>
                  {useCustomOrigin ? (
                    <Input placeholder="e.g. Burma, Ceylon" {...field} />
                  ) : (
                    <Select onValueChange={(val) => field.onChange(val)} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select origin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allOrigins.map((o) => (
                          <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fluorescence"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Fluorescence</FormLabel>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={() => setUseCustomFluorescence((v) => !v)}
                  >
                    {useCustomFluorescence ? "Use Preset" : "Custom"}
                  </Button>
                </div>
                <FormControl>
                  {useCustomFluorescence ? (
                    <Input placeholder="e.g. None, Faint" {...field} />
                  ) : (
                    <Select onValueChange={(val) => field.onChange(val)} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fluorescence" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="None">None</SelectItem>
                        <SelectItem value="Faint">Faint</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Strong">Strong</SelectItem>
                        <SelectItem value="Very Strong">Very Strong</SelectItem>
                        <SelectItem value="Not Applicable">Not Applicable</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}
