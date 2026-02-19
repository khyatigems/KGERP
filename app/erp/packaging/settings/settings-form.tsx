"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { updatePackagingSettings } from "@/app/erp/packaging/actions";
import { Loader2 } from "lucide-react";
import { PackagingLayoutPresets } from "@/components/packaging/packaging-layout-presets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createObjectUrl, generatePackagingPdfBlob } from "@/lib/packaging-pdf-generator";
import type { PackagingLabelData } from "@/lib/packaging-pdf-generator";
import Image from "next/image";

type PackagingSettingsFormData = {
  brandName: string;
  tagline: string;
  estYear: string;
  registeredAddress: string;
  gstin: string;
  iec: string;
  supportEmail: string;
  supportPhone: string;
  supportTimings: string;
  website: string;
  showRegisteredAddress: boolean;
  showGstin: boolean;
  showIec: boolean;
  showSupport: boolean;
  showWatermark: boolean;
  watermarkText: string;
  watermarkOpacity: string;
  watermarkRotation: string;
  watermarkFontSize: string;
  microBorderText: string;
  toleranceCarat: string;
  toleranceGram: string;
  labelVersion: string;
  careInstruction: string;
  legalMetrologyLine: string;
  logoUrl: string;
};

export type PackagingSettingsInitialData = Partial<Omit<PackagingSettingsFormData, "watermarkOpacity">> & {
  watermarkOpacity?: string | number;
  watermarkRotation?: string | number;
  watermarkFontSize?: string | number;
  toleranceCarat?: string | number;
  toleranceGram?: string | number;
};

export function SettingsForm({ initialData }: { initialData: PackagingSettingsInitialData | null }) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [formData, setFormData] = useState<PackagingSettingsFormData>(() => {
    const defaults: PackagingSettingsFormData = {
      brandName: "",
      tagline: "",
      estYear: "",
      registeredAddress: "",
      gstin: "",
      iec: "",
      supportEmail: "",
      supportPhone: "",
      supportTimings: "",
      website: "",
      watermarkText: "",
      watermarkOpacity: "6",
      watermarkRotation: "-30",
      watermarkFontSize: "16",
      microBorderText: "KHYATI GEMS AUTHENTIC PRODUCT",
      toleranceCarat: "0.01",
      toleranceGram: "0.01",
      labelVersion: "v1.0",
      careInstruction: "",
      legalMetrologyLine: "",
      logoUrl: "",
      showRegisteredAddress: true,
      showGstin: true,
      showIec: true,
      showSupport: true,
      showWatermark: true,
    };
    const initial = initialData || {};
    return {
      ...defaults,
      ...initial,
      // Ensure numeric fields are converted to strings
      watermarkOpacity: initial.watermarkOpacity?.toString() ?? defaults.watermarkOpacity,
      watermarkRotation: initial.watermarkRotation?.toString() ?? defaults.watermarkRotation,
      watermarkFontSize: initial.watermarkFontSize?.toString() ?? defaults.watermarkFontSize,
      toleranceCarat: initial.toleranceCarat?.toString() ?? defaults.toleranceCarat,
      toleranceGram: initial.toleranceGram?.toString() ?? defaults.toleranceGram,
    } as PackagingSettingsFormData;
  });


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const key = name as keyof PackagingSettingsFormData;
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const setBool = (key: keyof PackagingSettingsFormData, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [key]: checked } as PackagingSettingsFormData));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: String(reader.result || "") }));
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const label: PackagingLabelData = {
          serial: "KG-CERT-2602-000001-ABCD",
          sku: "KG-DEMO-SKU",
          gemstoneName: "Natural Emerald",
          stoneType: "Emerald",
          condition: "New",
          weightCarat: 1.5,
          weightRatti: 1.65,
          weightGrams: 0.3,
          color: "Green",
          clarityGrade: "VVS",
          cutGrade: "Excellent",
          treatment: "Natural",
          originCountry: "Colombia",
          cutPolishedIn: "India",
          certificateLab: "GCI",
          certificateNumber: "CERT-123456",
          mrp: 250000,
          hsn: "7103",
          gstin: formData.showGstin ? formData.gstin : undefined,
          iec: formData.showIec ? formData.iec : undefined,
          registeredAddress: formData.showRegisteredAddress ? formData.registeredAddress : undefined,
          qcCode: "QC-PASS",
          inventoryLocation: "LOC-01",
          packingDate: new Date(),
          printJobId: "PJ-260218-1234",
          unitQuantity: 1,
          madeIn: "India",
          declaredOriginal: true,
          brandName: formData.brandName || "KHYATI GEMS",
          tagline: formData.tagline || "",
          estYear: formData.estYear || "",
          logoUrl: formData.logoUrl || undefined,
          careInstruction: formData.careInstruction || undefined,
          legalMetrology: formData.legalMetrologyLine || undefined,
          supportEmail: formData.showSupport ? formData.supportEmail : undefined,
          supportPhone: formData.showSupport ? formData.supportPhone : undefined,
          supportTimings: formData.showSupport ? formData.supportTimings : undefined,
          supportWebsite: formData.showSupport ? formData.website : undefined,
          watermarkText: formData.showWatermark ? formData.watermarkText : undefined,
          watermarkOpacity: formData.showWatermark ? parseInt(formData.watermarkOpacity || "0", 10) : undefined,
          watermarkRotation: formData.showWatermark ? parseInt(formData.watermarkRotation || "-30", 10) : undefined,
          watermarkFontSize: formData.showWatermark ? parseInt(formData.watermarkFontSize || "16", 10) : undefined,
          microBorderText: formData.microBorderText || undefined,
          toleranceCarat: parseFloat(formData.toleranceCarat || "0.01"),
          toleranceGram: parseFloat(formData.toleranceGram || "0.01"),
          labelVersion: formData.labelVersion || undefined,
        };

        const blob = await generatePackagingPdfBlob(
          [label],
          {
            pageWidthMm: 100,
            pageHeightMm: 50,
            cols: 1,
            rows: 1,
            labelWidthMm: 100,
            labelHeightMm: 50,
            marginLeftMm: 0,
            marginTopMm: 0,
            gapXmm: 0,
            gapYmm: 0,
            offsetXmm: 0,
            offsetYmm: 0,
            startPosition: 1,
          },
          { selectedFields: ["header", "footer", "qr", "barcode", "price", "origin", "weight"], drawGuides: false }
        );
        if (cancelled) return;
        const url = createObjectUrl(blob);
        const prev = previewUrlRef.current;
        previewUrlRef.current = url;
        setPreviewUrl(url);
        if (prev) URL.revokeObjectURL(prev);
      } catch (err) {
        console.error("Live preview generation failed:", err);
        if (!cancelled) setPreviewUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formData]);

  useEffect(() => {
    return () => {
      const prev = previewUrlRef.current;
      if (prev) URL.revokeObjectURL(prev);
      previewUrlRef.current = null;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const wOpacity = parseInt(formData.watermarkOpacity, 10);
      const wRotation = parseInt(formData.watermarkRotation, 10);
      const wFontSize = parseInt(formData.watermarkFontSize, 10);
      const tCarat = parseFloat(formData.toleranceCarat);
      const tGram = parseFloat(formData.toleranceGram);

      const res = await updatePackagingSettings({
        ...formData,
        watermarkOpacity: isNaN(wOpacity) ? 6 : wOpacity,
        watermarkRotation: isNaN(wRotation) ? -30 : wRotation,
        watermarkFontSize: isNaN(wFontSize) ? 16 : wFontSize,
        toleranceCarat: isNaN(tCarat) ? 0.01 : tCarat,
        toleranceGram: isNaN(tGram) ? 0.01 : tGram,
      });
      if (res.success) {
        toast.success("Settings updated successfully");
      }
    } catch (err) {
      console.error("Settings update failed:", err);
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <CardContent className="h-[320px]">
          {previewUrl ? (
            <iframe src={previewUrl} className="w-full h-full border rounded" title="Packaging Settings Preview" />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Preview unavailable</div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Brand Name</Label>
          <Input name="brandName" value={formData.brandName || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Tagline</Label>
          <Input name="tagline" value={formData.tagline || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Est. Year</Label>
          <Input name="estYear" value={formData.estYear || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>Label Version</Label>
          <Input name="labelVersion" value={formData.labelVersion || ""} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Registered Address</Label>
        <Input name="registeredAddress" value={formData.registeredAddress || ""} onChange={handleChange} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>GSTIN</Label>
          <Input name="gstin" value={formData.gstin || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label>IEC</Label>
          <Input name="iec" value={formData.iec || ""} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">Visibility Toggles</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.showRegisteredAddress} onCheckedChange={(v) => setBool("showRegisteredAddress", !!v)} />
            <span className="text-sm">Show Registered Address</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.showGstin} onCheckedChange={(v) => setBool("showGstin", !!v)} />
            <span className="text-sm">Show GSTIN</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.showIec} onCheckedChange={(v) => setBool("showIec", !!v)} />
            <span className="text-sm">Show IEC</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.showSupport} onCheckedChange={(v) => setBool("showSupport", !!v)} />
            <span className="text-sm">Show Support Details</span>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={formData.showWatermark} onCheckedChange={(v) => setBool("showWatermark", !!v)} />
            <span className="text-sm">Show Watermark</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">Support Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="supportEmail" value={formData.supportEmail || ""} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input name="supportPhone" value={formData.supportPhone || ""} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Timings</Label>
            <Input name="supportTimings" value={formData.supportTimings || ""} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input name="website" value={formData.website || ""} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h3 className="text-lg font-medium">Label Config</h3>
        <div className="space-y-2">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
                {formData.logoUrl && (
                    <Image src={formData.logoUrl} alt="Logo Preview" width={120} height={64} unoptimized className="h-16 w-auto border rounded p-1" />
                )}
                <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
                {formData.logoUrl && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData((prev) => ({ ...prev, logoUrl: "" }))}>
                        Remove
                    </Button>
                )}
            </div>
            <p className="text-xs text-muted-foreground">Upload a square or landscape logo (PNG/JPG). It will be resized for the label.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Watermark Text</Label>
                <Input name="watermarkText" value={formData.watermarkText || ""} onChange={handleChange} />
            </div>
            <div className="space-y-2">
                <Label>Watermark Opacity (%)</Label>
                <div className="flex items-center gap-4">
                    <Input name="watermarkOpacity" type="range" min="3" max="50" value={formData.watermarkOpacity || "6"} onChange={handleChange} className="flex-1" />
                    <span className="w-12 text-sm text-right">{formData.watermarkOpacity || "6"}%</span>
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Watermark Rotation (deg)</Label>
            <div className="flex items-center gap-4">
              <Input name="watermarkRotation" type="range" min="-90" max="90" value={formData.watermarkRotation || "-30"} onChange={handleChange} className="flex-1" />
              <span className="w-12 text-sm text-right">{formData.watermarkRotation || "-30"}°</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Watermark Font Size (px)</Label>
            <div className="flex items-center gap-4">
              <Input name="watermarkFontSize" type="range" min="8" max="72" value={formData.watermarkFontSize || "16"} onChange={handleChange} className="flex-1" />
              <span className="w-12 text-sm text-right">{formData.watermarkFontSize || "16"}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tolerance (Carat)</Label>
            <Input name="toleranceCarat" type="number" step="0.01" value={formData.toleranceCarat} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Tolerance (Gram)</Label>
            <Input name="toleranceGram" type="number" step="0.01" value={formData.toleranceGram} onChange={handleChange} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Micro Border Text</Label>
          <Input name="microBorderText" value={formData.microBorderText || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
            <Label>Care Instructions</Label>
            <Input name="careInstruction" value={formData.careInstruction || ""} onChange={handleChange} />
        </div>
        <div className="space-y-2">
            <Label>Legal Metrology Line</Label>
            <Input name="legalMetrologyLine" value={formData.legalMetrologyLine || ""} onChange={handleChange} />
        </div>
      </div>

      <PackagingLayoutPresets />

      <Button type="submit" disabled={loading}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </form>
  );
}
