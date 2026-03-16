"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSettings } from "./actions";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export function SettingsForm({ config }: { config: Record<string, string> }) {
  const [message, setMessage] = useState("");

  async function handleSubmit(formData: FormData) {
    const res = await updateSettings(formData);
    setMessage(res.message || "Settings updated successfully");
  }

  return (
    <form action={handleSubmit}>
        <div className="grid gap-6">
            
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Visible on Quotations and Invoices</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input id="company_name" name="company_name" defaultValue={config.company_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_email">Support Email</Label>
                <Input id="company_email" name="company_email" defaultValue={config.company_email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_phone">Phone / WhatsApp</Label>
                <Input id="company_phone" name="company_phone" defaultValue={config.company_phone} required />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prefixes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quotation_prefix">Quotation Prefix</Label>
                <Input id="quotation_prefix" name="quotation_prefix" defaultValue={config.quotation_prefix} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Phase 3 Governance</CardTitle>
              <CardDescription>Controls for freeze mode and data completeness enforcement.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="governance_freeze_mode">System Freeze Mode (Read-only)</Label>
                  <p className="text-xs text-muted-foreground">Block write operations across governance-protected flows.</p>
                </div>
                <Switch id="governance_freeze_mode" name="governance_freeze_mode" defaultChecked={config.governance_freeze_mode === "true"} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="governance_block_sale_without_cert">Block sale if certification missing</Label>
                  <p className="text-xs text-muted-foreground">Requires inventory certification before sale creation.</p>
                </div>
                <Switch id="governance_block_sale_without_cert" name="governance_block_sale_without_cert" defaultChecked={config.governance_block_sale_without_cert === "true"} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div className="space-y-1">
                  <Label htmlFor="governance_block_invoice_without_customer_name">Block invoice if customer name missing</Label>
                  <p className="text-xs text-muted-foreground">Enforces customer identity for invoice generation.</p>
                </div>
                <Switch id="governance_block_invoice_without_customer_name" name="governance_block_invoice_without_customer_name" defaultChecked={config.governance_block_invoice_without_customer_name === "true"} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="governance_min_images_for_listing">Minimum images required before listing</Label>
                <Input id="governance_min_images_for_listing" name="governance_min_images_for_listing" type="number" min={0} defaultValue={config.governance_min_images_for_listing || "0"} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end items-center gap-4">
             {message && <p className="text-green-600 font-medium">{message}</p>}
             <Button type="submit" size="lg">Save Changes</Button>
          </div>
        </div>
      </form>
  );
}
