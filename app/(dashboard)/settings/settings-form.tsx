"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateSettings } from "./actions";
import { useState } from "react";

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

          <div className="flex justify-end items-center gap-4">
             {message && <p className="text-green-600 font-medium">{message}</p>}
             <Button type="submit" size="lg">Save Changes</Button>
          </div>
        </div>
      </form>
  );
}
