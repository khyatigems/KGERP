"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

interface ExportSettings {
  enableExportInvoice: boolean;
  defaultExportType: "LUT" | "BOND" | "PAYMENT";
  companyIec: string;
  defaultCurrency: "USD" | "EUR" | "GBP" | "INR";
  defaultPort: string;
  swiftCode: string;
}

export function ExportSettingsForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [settings, setSettings] = useState<ExportSettings>({
    enableExportInvoice: true,
    defaultExportType: "LUT",
    companyIec: "",
    defaultCurrency: "USD",
    defaultPort: "IGI Airport, New Delhi",
    swiftCode: "RATNINBBXXX",
  });

  useEffect(() => {
    // Load settings from API
    fetch("/api/settings/export")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setSettings({
            enableExportInvoice: data.enableExportInvoice ?? true,
            defaultExportType: data.defaultExportType ?? "LUT",
            companyIec: data.companyIec ?? "",
            defaultCurrency: data.defaultCurrency ?? "USD",
            defaultPort: data.defaultPort ?? "IGI Airport, New Delhi",
            swiftCode: data.swiftCode ?? "RATNINBBXXX",
          });
        }
      })
      .catch(() => {
        toast.error("Failed to load export settings");
      });
  }, []);

  const handleSave = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        if (res.ok) {
          toast.success("Export settings saved successfully");
          router.refresh();
        } else {
          toast.error("Failed to save export settings");
        }
      } catch {
        toast.error("Failed to save export settings");
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Export Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Export Invoice Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Export Invoice</Label>
            <p className="text-sm text-muted-foreground">
              Allow creation of export invoices for international sales
            </p>
          </div>
          <Switch
            checked={settings.enableExportInvoice}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, enableExportInvoice: checked })
            }
          />
        </div>

        {/* Default Export Type */}
        <div className="space-y-2">
          <Label htmlFor="defaultExportType">Default Export Type</Label>
          <Select
            value={settings.defaultExportType}
            onValueChange={(value: "LUT" | "BOND" | "PAYMENT") =>
              setSettings({ ...settings, defaultExportType: value })
            }
          >
            <SelectTrigger id="defaultExportType">
              <SelectValue placeholder="Select export type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LUT">LUT (Letter of Undertaking)</SelectItem>
              <SelectItem value="BOND">Bond</SelectItem>
              <SelectItem value="PAYMENT">Payment of IGST</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Default export type for new export invoices
          </p>
        </div>

        {/* Company IEC Code */}
        <div className="space-y-2">
          <Label htmlFor="companyIec">Company IEC Code</Label>
          <Input
            id="companyIec"
            value={settings.companyIec}
            onChange={(e) =>
              setSettings({ ...settings, companyIec: e.target.value })
            }
            placeholder="e.g., 0303011288"
          />
          <p className="text-sm text-muted-foreground">
            Importer Exporter Code (IEC) for export documentation
          </p>
        </div>

        {/* Default Currency */}
        <div className="space-y-2">
          <Label htmlFor="defaultCurrency">Default Currency</Label>
          <Select
            value={settings.defaultCurrency}
            onValueChange={(value: "USD" | "EUR" | "GBP" | "INR") =>
              setSettings({ ...settings, defaultCurrency: value })
            }
          >
            <SelectTrigger id="defaultCurrency">
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
              <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
              <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Default currency for export invoices
          </p>
        </div>

        {/* Default Port of Dispatch */}
        <div className="space-y-2">
          <Label htmlFor="defaultPort">Default Port of Dispatch</Label>
          <Input
            id="defaultPort"
            value={settings.defaultPort}
            onChange={(e) =>
              setSettings({ ...settings, defaultPort: e.target.value })
            }
            placeholder="e.g., IGI Airport, New Delhi"
          />
          <p className="text-sm text-muted-foreground">
            Default port/airport for export shipments
          </p>
        </div>

        {/* SWIFT Code */}
        <div className="space-y-2">
          <Label htmlFor="swiftCode">Bank SWIFT Code</Label>
          <Input
            id="swiftCode"
            value={settings.swiftCode}
            onChange={(e) => setSettings({ ...settings, swiftCode: e.target.value.toUpperCase() })}
            placeholder="e.g., RATNINBBXXX"
          />
          <p className="text-sm text-muted-foreground">
            Used on export invoices for international bank transfers.
          </p>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Export Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
